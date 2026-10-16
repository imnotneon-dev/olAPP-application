import glob
import os
import pandas as pd
from sqlalchemy import create_engine, text

# 1. Database Connection Setup
DATABASE_URL = os.getenv(
    "OLAPP_DB_CONNECTION",
    "postgresql://postgres:password@localhost:5432/olapp",
)
engine = create_engine(DATABASE_URL)


# ==========================================
# STEP 1: LOAD DIM_LOCATION
# ==========================================
def load_dim_location(csv_path="data/taxi_zone_lookup.csv"):
    print("Loading dim_location...")

    # Check if table already contains data
    with engine.connect() as conn:
        count = conn.execute(text("SELECT count(*) FROM dim_location")).scalar()
        if count > 0:
            print(f"dim_location already contains {count} rows. Skipping load.")
            return

    if not os.path.exists(csv_path):
        print(f"File {csv_path} not found. Skipping location dimension.")
        return

    df = pd.read_csv(csv_path)
    df = df.rename(
        columns={
            "LocationID": "location_id",
            "Borough": "borough",
            "Zone": "zone_name",
            "service_zone": "service_zone",
        }
    )

    # Clean missing string values
    df["borough"] = df["borough"].fillna("Unknown")
    df["zone_name"] = df["zone_name"].fillna("Unknown")
    df["service_zone"] = df["service_zone"].fillna("Unknown")

    # Select target columns
    df = df[["location_id", "borough", "zone_name", "service_zone"]]

    with engine.begin() as conn:
        df.to_sql(
            "dim_location",
            conn,
            if_exists="append",
            index=False,
            method="multi",
        )
    print(f"Successfully loaded {len(df)} rows into dim_location.")


# ==========================================
# STEP 2: GENERATE DIM_DATE & DIM_TIME
# ==========================================
def generate_dim_date(start_year=2024, end_year=2026):
    print("Generating dim_date...")

    with engine.connect() as conn:
        count = conn.execute(text("SELECT count(*) FROM dim_date")).scalar()
        if count > 0:
            print(
                f"dim_date already contains {count} rows. Skipping generation."
            )
            return

    dates = pd.date_range(
        start=f"{start_year}-01-01", end=f"{end_year}-12-31", freq="D"
    )

    df_date = pd.DataFrame({"full_date": dates})
    df_date["date_key"] = (
        df_date["full_date"].dt.strftime("%Y%m%d").astype(int)
    )
    df_date["year"] = df_date["full_date"].dt.year
    df_date["quarter"] = df_date["full_date"].dt.quarter
    df_date["month"] = df_date["full_date"].dt.month
    df_date["month_name"] = df_date["full_date"].dt.strftime("%B")
    df_date["day_of_month"] = df_date["full_date"].dt.day
    df_date["day_of_week"] = df_date["full_date"].dt.dayofweek + 1
    df_date["day_name"] = df_date["full_date"].dt.strftime("%A")
    df_date["is_weekend"] = df_date["day_of_week"].isin([6, 7])

    with engine.begin() as conn:
        df_date.to_sql(
            "dim_date", conn, if_exists="append", index=False, method="multi"
        )
    print(f"Successfully loaded {len(df_date)} rows into dim_date.")


def generate_dim_time():
    print("Generating dim_time...")

    with engine.connect() as conn:
        count = conn.execute(text("SELECT count(*) FROM dim_time")).scalar()
        if count > 0:
            print(
                f"dim_time already contains {count} rows. Skipping generation."
            )
            return

    time_records = []
    for hour in range(24):
        for minute in range(60):
            time_key = hour * 100 + minute

            if 6 <= hour < 10:
                category = "Morning Rush"
            elif 10 <= hour < 16:
                category = "Midday"
            elif 16 <= hour < 20:
                category = "Evening Rush"
            else:
                category = "Night"

            time_records.append(
                {
                    "time_key": time_key,
                    "hour": hour,
                    "minute": minute,
                    "time_of_day_category": category,
                }
            )

    df_time = pd.DataFrame(time_records)

    with engine.begin() as conn:
        df_time.to_sql(
            "dim_time", conn, if_exists="append", index=False, method="multi"
        )
    print(f"Successfully loaded {len(df_time)} rows into dim_time.")


def load_fact_taxi_trips():
    csv_files = glob.glob("data/green_*.csv")
    if not csv_files and os.path.exists("green_taxi_data.csv"):
        csv_files = ["green_taxi_data.csv"]

    if not csv_files:
        print("No raw green trip CSV files found.")
        return

    for file_path in csv_files:
        print(f"Processing raw trip file: {file_path}...")
        df = pd.read_csv(file_path, low_memory=False)

        # 1. CLEAN & FILTER DATETIMES
        df["lpep_pickup_datetime"] = pd.to_datetime(df["lpep_pickup_datetime"], format="mixed", errors="coerce")
        df["lpep_dropoff_datetime"] = pd.to_datetime(df["lpep_dropoff_datetime"], format="mixed", errors="coerce")

        # Drop invalid timestamps
        df = df.dropna(subset=["lpep_pickup_datetime", "lpep_dropoff_datetime"])

        # Filter out corrupt dates outside 2024–2026 to prevent dim_date FK failures
        df = df[
            (df["lpep_pickup_datetime"].dt.year >= 2024) & (df["lpep_pickup_datetime"].dt.year <= 2026) &
            (df["lpep_dropoff_datetime"].dt.year >= 2024) & (df["lpep_dropoff_datetime"].dt.year <= 2026)
        ]

        df["pickup_date_key"] = df["lpep_pickup_datetime"].dt.strftime("%Y%m%d").astype(int)
        df["pickup_time_key"] = df["lpep_pickup_datetime"].dt.hour * 100 + df["lpep_pickup_datetime"].dt.minute

        df["dropoff_date_key"] = df["lpep_dropoff_datetime"].dt.strftime("%Y%m%d").astype(int)
        df["dropoff_time_key"] = df["lpep_dropoff_datetime"].dt.hour * 100 + df["lpep_dropoff_datetime"].dt.minute

        df["trip_duration_seconds"] = (
            df["lpep_dropoff_datetime"] - df["lpep_pickup_datetime"]
        ).dt.total_seconds().astype(int)

        # 2. CLEAN NUMERIC COLUMNS (Strip commas)
        measure_cols = [
            "passenger_count", "trip_distance", "fare_amount", "extra",
            "mta_tax", "tip_amount", "tolls_amount", "improvement_surcharge",
            "congestion_surcharge", "cbd_congestion_fee", "total_amount"
        ]
        for col in measure_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(
                    df[col].astype(str).str.replace(",", "", regex=False),
                    errors="coerce"
                ).fillna(0.0)
            else:
                df[col] = 0.0

        # 3. SAFE FOREIGN KEYS (Map unexpected vendor/rate/payment codes to defaults)
        df["vendor_id"] = pd.to_numeric(df["VendorID"], errors="coerce").fillna(1).astype(int)
        df["vendor_id"] = df["vendor_id"].apply(lambda x: x if x in [1, 2] else 1)

        df["rate_code_id"] = pd.to_numeric(df["RatecodeID"], errors="coerce").fillna(1).astype(int)
        df["rate_code_id"] = df["rate_code_id"].apply(lambda x: x if x in range(1, 7) else 1)

        df["payment_type_id"] = pd.to_numeric(df["payment_type"], errors="coerce").fillna(1).astype(int)
        df["payment_type_id"] = df["payment_type_id"].apply(lambda x: x if x in range(1, 5) else 1)

        df["pickup_location_id"] = pd.to_numeric(df["PULocationID"], errors="coerce").fillna(264).astype(int)
        df["dropoff_location_id"] = pd.to_numeric(df["DOLocationID"], errors="coerce").fillna(264).astype(int)

        df["store_and_fwd_flag"] = df["store_and_fwd_flag"].fillna("N")
        df["trip_type"] = pd.to_numeric(df["trip_type"], errors="coerce").fillna(1).astype(int)

        fact_df = df[
            [
                "pickup_date_key", "pickup_time_key", "dropoff_date_key", "dropoff_time_key",
                "pickup_location_id", "dropoff_location_id", "vendor_id", "rate_code_id",
                "payment_type_id", "passenger_count", "trip_distance", "fare_amount",
                "extra", "mta_tax", "tip_amount", "tolls_amount", "improvement_surcharge",
                "congestion_surcharge", "cbd_congestion_fee", "total_amount",
                "trip_duration_seconds", "store_and_fwd_flag", "trip_type",
            ]
        ]

        print(f"Cleaned {len(fact_df)} records. Inserting into PostgreSQL...")
        try:
            with engine.begin() as conn:
                fact_df.to_sql(
                    "fact_taxi_trips",
                    conn,
                    if_exists="append",
                    index=False,
                    chunksize=1000,
                    method="multi",
                )
            print(f"Successfully loaded {len(fact_df)} records into fact_taxi_trips!")
        except Exception as err:
            print(f"Error during bulk insert: {err}")


if __name__ == "__main__":
    print("Starting ETL Execution Pipeline...")
    load_dim_location()
    generate_dim_date()
    generate_dim_time()
    load_fact_taxi_trips()
    print("ETL Pipeline finished successfully!")