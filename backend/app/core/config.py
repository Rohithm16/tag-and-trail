from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    APP_NAME: str = "Tag & Trail"
    DATABASE_URL: str
    SECRET_KEY: str = "change_me_in_production"
    DEBUG: bool = True

    # JWT
    JWT_SECRET_KEY: str = "change_this_jwt_secret_in_production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 10080  # 7 days

    # VirusTotal
    VT_API_KEY: str = ""

    # Upload limits
    MAX_FILE_SIZE_MB: int = 20


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()