"""Application settings."""

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings.

    Attributes:
        db_connection (SecretStr): Database connection
    """

    model_config = SettingsConfigDict(env_file=".env", env_prefix="OLAPP_")
    db_connection: SecretStr


settings = Settings()  # type: ignore
