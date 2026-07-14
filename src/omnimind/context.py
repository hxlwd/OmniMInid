from typing import Annotated

from pydantic import BaseModel, Field

SafeIdentifier = Annotated[str, Field(pattern=r"^[A-Za-z0-9._-]{1,64}$")]


class RuntimeContext(BaseModel):
    user_id: SafeIdentifier
    thread_id: SafeIdentifier | None = None
    request_id: SafeIdentifier | None = None
    timezone: str = "Asia/Shanghai"
    debug_events: bool = False
