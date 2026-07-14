import pytest
from pydantic import ValidationError

from omnimind.context import RuntimeContext


def test_context_accepts_safe_test_identifiers() -> None:
    context = RuntimeContext(
        user_id="student_001",
        thread_id="thread-001",
        request_id="request.001",
    )

    assert context.user_id == "student_001"
    assert context.thread_id == "thread-001"
    assert context.request_id == "request.001"


@pytest.mark.parametrize("field", ["user_id", "thread_id", "request_id"])
def test_context_rejects_path_characters(field: str) -> None:
    values = {
        "user_id": "student_001",
        "thread_id": "thread-001",
        "request_id": "request.001",
    }
    values[field] = "../other-user"

    with pytest.raises(ValidationError):
        RuntimeContext(**values)


@pytest.mark.parametrize("value", [".", ".."])
def test_context_rejects_dot_segments(value: str) -> None:
    with pytest.raises(ValidationError):
        RuntimeContext(user_id=value)
