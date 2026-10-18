-- Dimension 1
CREATE TABLE dim_vendor (
    vendor_id INT PRIMARY KEY,
    vendor_name VARCHAR(100) NOT NULL
);

-- Dimension 2
CREATE TABLE dim_rate_code (
    rate_code_id INT PRIMARY KEY,
    rate_code_name VARCHAR(50) NOT NULL,
    rate_category VARCHAR(50) NOT NULL
);

-- Dimension 3
CREATE TABLE dim_payment_type (
    payment_type_id INT PRIMARY KEY,
    payment_name VARCHAR(50) NOT NULL,
    payment_category VARCHAR(50) NOT NULL
);

-- Dimension 4
CREATE TABLE dim_location (
    location_id INT PRIMARY KEY,
    borough VARCHAR(50) NOT NULL,
    zone_name VARCHAR(100) NOT NULL,
    service_zone VARCHAR(50) NOT NULL
);

-- Dimension 5
CREATE TABLE dim_date (
    date_key INT PRIMARY KEY, -- Format: YYYYMMDD
    full_date DATE NOT NULL,
    year INT NOT NULL,
    quarter INT NOT NULL,
    month INT NOT NULL,
    month_name VARCHAR(20) NOT NULL,
    day_of_month INT NOT NULL,
    day_of_week INT NOT NULL,
    day_name VARCHAR(20) NOT NULL,
    is_weekend BOOLEAN NOT NULL
);

-- Dimension 6
CREATE TABLE dim_time (
    time_key INT PRIMARY KEY, -- Format: HHMM
    hour INT NOT NULL,
    minute INT NOT NULL,
    time_of_day_category VARCHAR(30) NOT NULL
);

-- Fact Table
CREATE TABLE fact_taxi_trips (
    trip_id BIGSERIAL PRIMARY KEY,
    
    pickup_date_key INT NOT NULL REFERENCES dim_date(date_key),
    pickup_time_key INT NOT NULL REFERENCES dim_time(time_key),
    dropoff_date_key INT NOT NULL REFERENCES dim_date(date_key),
    dropoff_time_key INT NOT NULL REFERENCES dim_time(time_key),
    pickup_location_id INT NOT NULL REFERENCES dim_location(location_id),
    dropoff_location_id INT NOT NULL REFERENCES dim_location(location_id),
    vendor_id INT NOT NULL REFERENCES dim_vendor(vendor_id),
    rate_code_id INT NOT NULL REFERENCES dim_rate_code(rate_code_id),
    payment_type_id INT NOT NULL REFERENCES dim_payment_type(payment_type_id),

    passenger_count INT,
    trip_distance NUMERIC(8,2),
    fare_amount NUMERIC(8,2),
    extra NUMERIC(8,2),
    mta_tax NUMERIC(8,2),
    tip_amount NUMERIC(8,2),
    tolls_amount NUMERIC(8,2),
    improvement_surcharge NUMERIC(8,2),
    congestion_surcharge NUMERIC(8,2),
    cbd_congestion_fee NUMERIC(8,2),
    total_amount NUMERIC(8,2),
    trip_duration_seconds INT,
    
    store_and_fwd_flag VARCHAR(1),
    trip_type INT
);

CREATE INDEX idx_dim_date_year_quarter ON dim_date(year, quarter);
CREATE INDEX idx_dim_date_year_month ON dim_date(year, month);
CREATE INDEX idx_dim_location_borough ON dim_location(borough);
CREATE INDEX idx_dim_payment_name ON dim_payment_type(payment_name);

CREATE INDEX idx_fact_pickup_date ON fact_taxi_trips(pickup_date_key);
CREATE INDEX idx_fact_dropoff_date ON fact_taxi_trips(dropoff_date_key);
CREATE INDEX idx_fact_pickup_loc ON fact_taxi_trips(pickup_location_id);
CREATE INDEX idx_fact_dropoff_loc ON fact_taxi_trips(dropoff_location_id);
CREATE INDEX idx_fact_vendor ON fact_taxi_trips(vendor_id);
CREATE INDEX idx_fact_payment_type ON fact_taxi_trips(payment_type_id);

CREATE INDEX idx_fact_date_location ON fact_taxi_trips(pickup_date_key, pickup_location_id);

CREATE INDEX idx_fact_date_payment ON fact_taxi_trips(pickup_date_key, payment_type_id);

CREATE INDEX idx_fact_date_loc_payment ON fact_taxi_trips(pickup_date_key, pickup_location_id, payment_type_id);