import os
from fastapi import FastAPI, Depends
from sqlmodel import Session, create_engine, text

# 1. Initialize FastAPI App
app = FastAPI(
    title="NYC Green Taxi Data Warehouse API",
    description="OLAP API for analyzing NYC Green Taxi trip data",
    version="1.0.0",
)

# 2. Setup Database Connection
DATABASE_URL = os.getenv(
    "OLAPP_DB_CONNECTION",
    "postgresql://postgres:password@db:5432/olapp"
)
engine = create_engine(DATABASE_URL, echo=False)


def get_session():
    """Dependency helper to yield database sessions safely."""
    with Session(engine) as session:
        yield session


# 3. Base / Root Route
@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "NYC Green Taxi Data Warehouse API",
        "docs": "/docs",
    }


# 4. Sample Analytical Endpoints
@app.get("/trips")
def get_sample_trips(limit: int = 10, session: Session = Depends(get_session)):
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
    result = session.exec(query, params={"limit": limit}).mappings().all()
    return {"count": len(result), "data": result}


@app.get("/analytics/revenue-by-location")
def get_top_pickup_zones(
    limit: int = 10, session: Session = Depends(get_session)
):
    query = text("""
        SELECT 
            l.zone_name AS pickup_zone,
            COUNT(f.trip_id) AS total_trips,
            ROUND(SUM(f.total_amount)::numeric, 2) AS total_revenue
        FROM fact_taxi_trips f
        JOIN dim_location l ON f.pickup_location_id = l.location_id
        GROUP BY l.zone
        ORDER BY total_revenue DESC
        LIMIT :limit;
    """)
    result = session.exec(query, params={"limit": limit}).mappings().all()
    return {"data": result}