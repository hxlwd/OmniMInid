from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from unittest.mock import MagicMock

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from omnimind.api.app import create_app


@asynccontextmanager
async def app_client(app: FastAPI) -> AsyncIterator[AsyncClient]:
    async with app.router.lifespan_context(app):
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            yield client


@pytest.mark.asyncio
async def test_liveness_does_not_depend_on_external_services() -> None:
    factory = MagicMock(side_effect=RuntimeError("Mongo 不可用"))

    async with app_client(create_app(runtime_factory=factory)) as client:
        response = await client.get("/health/live")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_readiness_is_unavailable_when_runtime_startup_fails() -> None:
    factory = MagicMock(
        side_effect=RuntimeError("mongodb://admin:password@mongo:27017 连接失败")
    )

    async with app_client(create_app(runtime_factory=factory)) as client:
        response = await client.get("/health/ready")

    assert response.status_code == 503
    assert response.json() == {
        "status": "unavailable",
        "reason": "mongodb://***:***@mongo:27017 连接失败",
    }


@pytest.mark.asyncio
async def test_readiness_pings_mongo_and_runtime_closes_on_shutdown() -> None:
    runtime = MagicMock()

    async with app_client(create_app(runtime_factory=lambda: runtime)) as client:
        response = await client.get("/health/ready")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    runtime.ensure_indexes.assert_called_once_with()
    runtime.ping.assert_called_once_with()
    runtime.close.assert_called_once_with()


@pytest.mark.asyncio
async def test_readiness_is_unavailable_when_ping_fails() -> None:
    runtime = MagicMock()
    runtime.ping.side_effect = RuntimeError("Mongo ping 失败")

    async with app_client(create_app(runtime_factory=lambda: runtime)) as client:
        response = await client.get("/health/ready")

    assert response.status_code == 503
    assert response.json() == {"status": "unavailable", "reason": "Mongo ping 失败"}
