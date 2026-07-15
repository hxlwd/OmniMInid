from typing import Annotated

from pydantic import BaseModel, Field, field_validator

SafeIdentifier = Annotated[str, Field(pattern=r"^[A-Za-z0-9._-]{1,64}$")]


class RuntimeContext(BaseModel):
    user_id: SafeIdentifier
    thread_id: SafeIdentifier | None = None
    request_id: SafeIdentifier | None = None
    timezone: str = "Asia/Shanghai"
    debug_events: bool = False

    @field_validator("user_id", "thread_id", "request_id")
    @classmethod
    def reject_dot_segments(cls, value: str | None) -> str | None:
        if value in {".", ".."}:
            raise ValueError("标识符不能是目录点段")
        return value
