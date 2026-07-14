import re
from re import Match

_KEY = re.compile(r"sk-[A-Za-z0-9_-]{12,}")
_BEARER = re.compile(r"Bearer\s+[^\s]+", re.IGNORECASE)
_CONNECTION = re.compile(
    r"(?P<scheme>(?:mongodb(?:\+srv)?|redis(?:s)?|mysql|postgres(?:ql)?)://)"
    r"[^/@\s]+(?::[^/@\s]*)?@",
    re.IGNORECASE,
)


def _redact_connection(match: Match[str]) -> str:
    return f"{match.group('scheme')}***:***@"


def redact_secrets(text: str) -> str:
    text = _KEY.sub("sk-***", text)
    text = _BEARER.sub("Bearer ***", text)
    return _CONNECTION.sub(_redact_connection, text)
