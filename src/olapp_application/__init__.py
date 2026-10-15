"""Main package."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlmodel import SQLModel

from .database import engine


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: D103
    SQLModel.metadata.create_all(engine)
    yield


app = FastAPI(lifespan=lifespan)
