from functools import lru_cache

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    deepseek_api_key: SecretStr
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_main_model: str = "deepseek-v4-pro"
    deepseek_summary_model: str = "deepseek-v4-flash"
    qwen_api_key: SecretStr
    qwen_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    qwen_vision_model: str = "qwen3.5-flash"
    mongodb_uri: SecretStr = SecretStr("mongodb://localhost:27017")
    mongodb_database: str = "omnimind"


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
