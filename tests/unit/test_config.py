from pydantic import SecretStr

from omnimind.config import Settings
from omnimind.logging import redact_secrets


def test_settings_use_current_model_defaults() -> None:
    settings = Settings(_env_file=None, deepseek_api_key="test", qwen_api_key="test")

    assert settings.deepseek_main_model == "deepseek-v4-pro"
    assert settings.deepseek_summary_model == "deepseek-v4-flash"
    assert settings.qwen_vision_model == "qwen3.5-flash"
    assert isinstance(settings.deepseek_api_key, SecretStr)
    assert isinstance(settings.qwen_api_key, SecretStr)


def test_redaction_removes_keys_bearer_tokens_and_connection_credentials() -> None:
    raw = (
        "key="
        + "sk-"
        + "abcdefghijklmnopqrstuvwxyz Bearer abc.def.ghi "
        + "mongodb://admin:password@mongo:27017 redis://cache:secret@redis:6379"
    )

    redacted = redact_secrets(raw)

    assert redacted == (
        "key=sk-*** Bearer *** "
        "mongodb://***:***@mongo:27017 redis://***:***@redis:6379"
    )
    assert "password" not in redacted
    assert "secret" not in redacted
