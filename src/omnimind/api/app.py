from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

from omnimind.config import get_settings
from omnimind.logging import redact_secrets
from omnimind.persistence.mongo import MongoRuntime

RuntimeFactory = Callable[[], MongoRuntime]


def _runtime_from_settings() -> MongoRuntime:
    settings = get_settings()
    return MongoRuntime.from_uri(
        settings.mongodb_uri.get_secret_value(),
        settings.mongodb_database,
    )


def create_app(runtime_factory: RuntimeFactory | None = None) -> FastAPI:
    factory = runtime_factory or _runtime_from_settings

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        runtime: MongoRuntime | None = None
        app.state.mongo_runtime = None
        app.state.readiness_error = "MongoDB 尚未初始化"
        try:
            runtime = factory()
            await run_in_threadpool(runtime.ensure_indexes)
            app.state.mongo_runtime = runtime
            app.state.readiness_error = None
        except Exception as error:
            app.state.readiness_error = redact_secrets(str(error))

        try:
            yield
        finally:
            if runtime is not None:
                await run_in_threadpool(runtime.close)

    app = FastAPI(title="OmniMind API", version="0.1.0", lifespan=lifespan)

    @app.get("/health/live")
    async def live() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/health/ready")
    async def ready() -> JSONResponse:
        runtime: MongoRuntime | None = app.state.mongo_runtime
        if runtime is None:
            return JSONResponse(
                status_code=503,
                content={
                    "status": "unavailable",
                    "reason": app.state.readiness_error,
                },
            )
        try:
            await run_in_threadpool(runtime.ping)
        except Exception as error:
            return JSONResponse(
                status_code=503,
                content={
                    "status": "unavailable",
                    "reason": redact_secrets(str(error)),
                },
            )
        return JSONResponse(status_code=200, content={"status": "ok"})

    return app


app = create_app()
