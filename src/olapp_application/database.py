"""Database connection."""

from sqlalchemy import create_engine

from .settings import settings

engine = create_engine(settings.db_connection.get_secret_value())
