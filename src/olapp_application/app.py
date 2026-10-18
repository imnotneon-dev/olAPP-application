import os
from fastapi import FastAPI, Depends, Query
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

@app.get("/rollup")
def get_rollup(
    quarter: int = Query(..., ge=1, le=4),
    session: Session = Depends(get_session),
):
    query = text("""
        SELECT
            d.month,
            d.month_name,
            l.borough AS pickup_borough,
            ROUND(SUM(f.total_amount)::numeric, 2) AS total_revenue,
            COUNT(f.trip_id) AS total_trip_volume,
            ROUND(
                (
                    SUM(CASE WHEN f.trip_distance > 0 THEN f.fare_amount ELSE 0 END)
                    / NULLIF(
                        SUM(CASE WHEN f.trip_distance > 0 THEN f.trip_distance ELSE 0 END),
                        0
                    )
                )::numeric,
                2
            ) AS average_fare_per_mile
        FROM fact_taxi_trips f
        JOIN dim_date d ON f.pickup_date_key = d.date_key
        JOIN dim_location l ON f.pickup_location_id = l.location_id
        WHERE d.year = 2025 AND d.quarter = :quarter
        GROUP BY d.month, d.month_name, l.borough
        ORDER BY d.month, l.borough;
    """)
    result = session.exec(query, params={"quarter": quarter}).mappings().all()
    return {"year": 2025, "quarter": quarter, "data": result}

@app.get("/drilldown")
def get_drilldown(
    month: int = Query(..., ge=1, le=12),
    borough: str = Query(...),
    session: Session = Depends(get_session),
):
    query = text("""
        SELECT
            l.borough AS pickup_borough,
            l.zone_name AS pickup_neighborhood,
            d.month,
            d.day_of_week,
            d.day_name,
            t.hour AS pickup_hour,
            COUNT(*) AS total_trips,
            AVG(f.passenger_count) AS avg_passenger_count,
            SUM(f.tip_amount) AS total_tips
        FROM fact_taxi_trips f
        JOIN dim_date d
            ON f.pickup_date_key = d.date_key
        JOIN dim_time t
            ON f.pickup_time_key = t.time_key
        JOIN dim_location l
            ON f.pickup_location_id = l.location_id
        WHERE d.year = 2025
        AND d.month = :month
        AND l.borough = :borough
        GROUP BY
            l.borough,
            l.zone_name,
            d.month,
            d.day_of_week,
            d.day_name,
            t.hour
        ORDER BY
            l.zone_name,
            d.day_of_week,
            t.hour;

    """)
    result = session.exec(
        query, params={"month": month, "borough": borough}
    ).mappings().all()
    return {"year": 2025, "month": month, "borough": borough, "data": result}