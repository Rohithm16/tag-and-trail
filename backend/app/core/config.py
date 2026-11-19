from functools import lru_cache
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    APP_NAME: str = "Tag & Trail"
    DATABASE_URL: str
    SECRET_KEY: str = "change_me_in_production"
    DEBUG: bool = True
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug_mode(cls, value):
        """Accept deployment-style values such as ``DEBUG=release``."""
        if isinstance(value, str) and value.strip().lower() in {"release", "production", "prod"}:
            return False
        return value

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
