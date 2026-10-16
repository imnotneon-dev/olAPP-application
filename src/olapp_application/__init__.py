"""Main package."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlmodel import Session, SQLModel, text

from .database import engine


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: D103
    SQLModel.metadata.create_all(engine)
    yield


app = FastAPI(title="NYC Green Taxi Data Warehouse API", lifespan=lifespan)


@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "NYC Green Taxi Data Warehouse API",
        "docs": "/docs",
    }


@app.get("/trips")
def get_sample_trips(limit: int = 10):
    query = text("""
        SELECT 
            f.trip_id,
            v.vendor_name,
            l.zone_name AS pickup_zone,
            f.trip_distance,
            f.total_amount
        FROM fact_taxi_trips f
        JOIN dim_vendor v ON f.vendor_id = v.vendor_id
        JOIN dim_location l ON f.pickup_location_id = l.location_id
        LIMIT :limit;
    """)
    
    with Session(engine) as session:
        result = session.exec(query, params={"limit": limit}).mappings().all()
        
    return {"count": len(result), "data": result}