from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True
    )

    APP_NAME: str
    DATABASE_URL: str
    SECRET_KEY: str
    DEBUG: bool


@lru_cache
def get_settings():
    return Settings()


settings = get_settings()