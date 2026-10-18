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


@app.get("/rollup")
def get_rollup(
    quarter: int = Query(..., ge=1, le=4),
    session: Session = Depends(get_session),
):
    query = text("""
        WITH selected_dates AS (
            SELECT date_key, month, month_name
            FROM dim_date
            WHERE year = 2025
              AND quarter = :quarter
        )
        SELECT
            d.month,
            d.month_name,
            l.borough AS pickup_borough,
            ROUND(SUM(f.total_amount)::numeric, 2) AS total_revenue,
            COUNT(*) AS total_trip_volume,
            ROUND(
                (
                    SUM(f.fare_amount) FILTER (WHERE f.trip_distance > 0)
                    /
                    NULLIF(SUM(f.trip_distance) FILTER (WHERE f.trip_distance > 0), 0)
                )::numeric,
                2
            ) AS average_fare_per_mile
        FROM selected_dates d
        JOIN fact_taxi_trips f
            ON f.pickup_date_key = d.date_key
        JOIN dim_location l
            ON l.location_id = f.pickup_location_id
        GROUP BY
            d.month,
            d.month_name,
            l.borough
        ORDER BY
            d.month,
            l.borough;
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
        WITH selected_dates AS (
            SELECT date_key, month, day_of_week, day_name
            FROM dim_date
            WHERE year = 2025
              AND month = :month
        ),
        selected_locations AS (
            SELECT location_id, borough, zone_name
            FROM dim_location
            WHERE borough = :borough
        )
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
        FROM selected_dates d
        JOIN fact_taxi_trips f
            ON f.pickup_date_key = d.date_key
        JOIN selected_locations l
            ON l.location_id = f.pickup_location_id
        JOIN dim_time t
            ON t.time_key = f.pickup_time_key
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


@app.get("/slice")
def get_slice(
    payment_option: str = Query(...),
    session: Session = Depends(get_session),
):
    query = text("""
        WITH selected_dates AS (
            SELECT date_key, month, month_name
            FROM dim_date
            WHERE year = 2025
        ),
        selected_payment AS (
            SELECT payment_type_id, payment_name
            FROM dim_payment_type
            WHERE payment_name = :payment_option
        )
        SELECT
            d.month,
            d.month_name,
            p.payment_name,
            SUM(f.total_amount) AS total_revenue,
            ROUND(AVG(f.fare_amount)::numeric, 2) AS average_fare,
            ROUND(
                (
                    100.0 * SUM(f.tip_amount)
                    / NULLIF(SUM(f.fare_amount), 0)
                )::numeric,
                2
            ) AS average_tip_percentage
        FROM selected_dates d
        JOIN fact_taxi_trips f
            ON f.pickup_date_key = d.date_key
        JOIN selected_payment p
            ON p.payment_type_id = f.payment_type_id
        GROUP BY
            d.month,
            d.month_name,
            p.payment_name
        ORDER BY
            d.month;
    """)
    result = session.exec(query, params={"payment_option": payment_option}).mappings().all()
    return {"payment_option": payment_option, "data": result}


@app.get("/slice_and_dice")
def get_slice_and_dice(
    pickup_borough: str = Query(...),
    payment_option: str = Query(...),
    session: Session = Depends(get_session),
):
    query = text("""
        WITH selected_dates AS (
            SELECT date_key
            FROM dim_date
            WHERE year = 2025
        ),
        selected_locations AS (
            SELECT location_id
            FROM dim_location
            WHERE borough = :pickup_borough
        ),
        selected_payments AS (
            SELECT payment_type_id
            FROM dim_payment_type
            WHERE payment_name = :payment_option
        ),
        filtered_trips AS (
            SELECT
                CASE
                    WHEN f.trip_distance < 3 THEN 'Short'
                    WHEN f.trip_distance < 10 THEN 'Medium'
                    ELSE 'Long'
                END AS distance_tier,
                f.fare_amount,
                f.tip_amount,
                COALESCE(f.extra, 0)
                + COALESCE(f.mta_tax, 0)
                + COALESCE(f.tolls_amount, 0)
                + COALESCE(f.improvement_surcharge, 0)
                + COALESCE(f.congestion_surcharge, 0)
                + COALESCE(f.cbd_congestion_fee, 0) AS total_surcharges
            FROM fact_taxi_trips f
            JOIN selected_dates d
                ON d.date_key = f.pickup_date_key
            JOIN selected_locations l
                ON l.location_id = f.pickup_location_id
            JOIN selected_payments p
                ON p.payment_type_id = f.payment_type_id
            WHERE f.trip_distance >= 0
        )
        SELECT
            distance_tier,
            COUNT(*) AS total_trips,
            AVG(fare_amount) AS average_fare,
            100.0 * SUM(tip_amount)
                / NULLIF(SUM(fare_amount), 0)
                AS tipping_percentage,
            SUM(total_surcharges) AS total_surcharges
        FROM filtered_trips
        GROUP BY distance_tier
        ORDER BY
            CASE distance_tier
                WHEN 'Short' THEN 1
                WHEN 'Medium' THEN 2
                ELSE 3
            END;
    """)
    result = session.exec(
        query, params={"payment_option": payment_option, "pickup_borough": pickup_borough}
    ).mappings().all()
    return {"payment_option": payment_option, "pickup_borough": pickup_borough, "data": result}