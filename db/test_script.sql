-- TEST CASE TC-ETL-01: Fact Table Ingestion Row Count Reconciliation
-- Rationale: Ensure no transactional records were dropped or duplicated.
SELECT 
    'TC-ETL-01: Row Count Integrity' AS test_name,
    COUNT(*) AS actual_fact_rows,
    591483 AS expected_fact_rows,
    CASE WHEN COUNT(*) = 591483 THEN 'PASS' ELSE 'FAIL' END AS status
FROM fact_taxi_trips;

-- TEST CASE TC-ETL-02: Date Key Boundary & Surrogate Mapping Check
-- Rationale: Validate timestamp parsing logic and multi-year coverage bounds (2024-2026).
SELECT 
    'TC-ETL-02: Date Boundary Check' AS test_name,
    COUNT(*) AS out_of_bounds_records,
    0 AS expected_out_of_bounds,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status
FROM fact_taxi_trips
WHERE pickup_date_key < 20240101 OR pickup_date_key > 20261231;

-- TEST CASE TC-ETL-03: Measure Cleaning & Physical Anomaly Removal
-- Rationale: Confirm filtering of impossible negative trip distances and passenger counts.
SELECT 
    'TC-ETL-03: Physical Metric Cleansing' AS test_name,
    COUNT(*) AS invalid_physical_records,
    0 AS expected_invalid_records,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status
FROM fact_taxi_trips
WHERE trip_distance < 0 OR passenger_count < 0 OR trip_duration_seconds < 0;

-- TEST CASE TC-ETL-04: Spatial Referential Integrity & Unknown Fallback Mapping
-- Rationale: Verify unmapped/missing location IDs default to Key 264 without FK crashes.
SELECT 
    'TC-ETL-04: Spatial Fallback Mapping' AS test_name,
    COUNT(*) AS unmapped_orphan_locations,
    0 AS expected_orphans,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status
FROM fact_taxi_trips f
LEFT JOIN dim_location l ON f.pickup_location_id = l.location_id
WHERE l.location_id IS NULL;

-- Test Case TC-OLAP-01: Roll-Up Execution (Quarter 1, 2025)
-- TC-OLAP-01: Roll-Up Q1 2025 Verification
SELECT 
    d.month,
    d.month_name,
    l.borough AS pickup_borough,
    ROUND(SUM(f.total_amount)::numeric, 2) AS total_revenue,
    COUNT(f.trip_id) AS total_trip_volume,
    ROUND((SUM(CASE WHEN f.trip_distance > 0 THEN f.fare_amount ELSE 0 END) 
         / NULLIF(SUM(CASE WHEN f.trip_distance > 0 THEN f.trip_distance ELSE 0 END), 0))::numeric, 2) AS avg_fare_per_mile
FROM fact_taxi_trips f
JOIN dim_date d ON f.pickup_date_key = d.date_key
JOIN dim_location l ON f.pickup_location_id = l.location_id
WHERE d.year = 2025 AND d.quarter = 1
GROUP BY d.month, d.month_name, l.borough
ORDER BY d.month, l.borough
LIMIT 5;

-- Ground-Truth Check for TC-OLAP-01: Compare against raw un-joined fact table
SELECT 
    'Ground Truth Q1 Month 1 Trip Count' AS assertion_check,
    COUNT(*) AS raw_count
FROM fact_taxi_trips 
WHERE pickup_date_key BETWEEN 20250101 AND 20250131;

-- Test Case TC-OLAP-02: Roll-Up Parameter Variation (Quarter 4, 2025)
-- TC-OLAP-02: Roll-Up Q4 2025 Verification
SELECT 
    d.month,
    l.borough AS pickup_borough,
    ROUND(SUM(f.total_amount)::numeric, 2) AS total_revenue
FROM fact_taxi_trips f
JOIN dim_date d ON f.pickup_date_key = d.date_key
JOIN dim_location l ON f.pickup_location_id = l.location_id
WHERE d.year = 2025 AND d.quarter = 4
GROUP BY d.month, l.borough
ORDER BY d.month, l.borough
LIMIT 5;

-- Test Case TC-OLAP-03: Drill-Down Execution (Month 4, Manhattan)
-- TC-OLAP-03: Drill-Down Manhattan April 2025 Verification
SELECT 
    l.borough AS pickup_borough,
    l.zone_name AS pickup_neighborhood,
    d.month,
    d.day_name,
    t.hour AS pickup_hour,
    COUNT(*) AS total_trips,
    ROUND(AVG(f.passenger_count)::numeric, 2) AS avg_passenger_count,
    ROUND(SUM(f.tip_amount)::numeric, 2) AS total_tips
FROM fact_taxi_trips f
JOIN dim_date d ON f.pickup_date_key = d.date_key
JOIN dim_time t ON f.pickup_time_key = t.time_key
JOIN dim_location l ON f.pickup_location_id = l.location_id
WHERE d.year = 2025 AND d.month = 4 AND l.borough = 'Manhattan'
GROUP BY l.borough, l.zone_name, d.month, d.day_of_week, d.day_name, t.hour
ORDER BY l.zone_name, d.day_of_week, t.hour
LIMIT 5;

-- Test Case TC-OLAP-04: Boundary Condition / Invalid Parameter Handling
-- Rationale: Verify system returns 0 rows cleanly without crashing on empty matches.
SELECT 
    'TC-OLAP-04: Empty Result Boundary' AS test_name,
    COUNT(*) AS returned_rows,
    0 AS expected_rows,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status
FROM fact_taxi_trips f
JOIN dim_date d ON f.pickup_date_key = d.date_key
JOIN dim_location l ON f.pickup_location_id = l.location_id
WHERE d.year = 2025 AND d.month = 4 AND l.borough = 'NonExistentBorough';

-- Test Case TC-OLAP-05: Slice Execution (Credit Card Payments)
-- TC-OLAP-05: Slice Credit Card 2025 Verification
SELECT 
    d.month,
    d.month_name,
    p.payment_name,
    ROUND(SUM(f.total_amount)::numeric, 2) AS total_revenue,
    ROUND(AVG(f.fare_amount)::numeric, 2) AS average_fare,
    ROUND((100.0 * SUM(f.tip_amount) / NULLIF(SUM(f.fare_amount), 0))::numeric, 2) AS average_tip_percentage
FROM fact_taxi_trips f
JOIN dim_date d ON f.pickup_date_key = d.date_key
JOIN dim_payment_type p ON f.payment_type_id = p.payment_type_id
WHERE d.year = 2025 AND p.payment_name = 'Credit card'
GROUP BY d.year, d.month, d.month_name, p.payment_name
ORDER BY d.month
LIMIT 5;

-- Test Case TC-OLAP-06: Slice Parameter Variation (Cash Payments)
-- TC-OLAP-06: Slice Cash 2025 Verification
SELECT 
    p.payment_name,
    ROUND(SUM(f.tip_amount)::numeric, 2) AS total_cash_tips,
    ROUND((100.0 * SUM(f.tip_amount) / NULLIF(SUM(f.fare_amount), 0))::numeric, 2) AS cash_tip_percentage
FROM fact_taxi_trips f
JOIN dim_date d ON f.pickup_date_key = d.date_key
JOIN dim_payment_type p ON f.payment_type_id = p.payment_type_id
WHERE d.year = 2025 AND p.payment_name = 'Cash'
GROUP BY p.payment_name;

-- Test Case TC-OLAP-07: Slice-and-Dice Execution (Queens + Credit Card)
-- TC-OLAP-07: Slice & Dice Queens + Credit Card Verification
WITH trip_data AS (
    SELECT 
        f.fare_amount,
        f.tip_amount,
        f.trip_distance,
        (COALESCE(f.extra,0) + COALESCE(f.mta_tax,0) + COALESCE(f.tolls_amount,0) +
         COALESCE(f.improvement_surcharge,0) + COALESCE(f.congestion_surcharge,0) +
         COALESCE(f.cbd_congestion_fee,0)) AS total_surcharges,
        CASE 
            WHEN f.trip_distance < 3 THEN 'Short'
            WHEN f.trip_distance < 10 THEN 'Medium'
            ELSE 'Long'
        END AS distance_tier
    FROM fact_taxi_trips f
    JOIN dim_date d ON f.pickup_date_key = d.date_key
    JOIN dim_location l ON f.pickup_location_id = l.location_id
    JOIN dim_payment_type p ON f.payment_type_id = p.payment_type_id
    WHERE d.year = 2025 AND l.borough = 'Queens' AND p.payment_name = 'Credit card' AND f.trip_distance >= 0
)
SELECT 
    distance_tier,
    COUNT(*) AS total_trips,
    ROUND(AVG(fare_amount)::numeric, 2) AS average_fare,
    ROUND((100.0 * SUM(tip_amount) / NULLIF(SUM(fare_amount), 0))::numeric, 2) AS tipping_percentage,
    ROUND(SUM(total_surcharges)::numeric, 2) AS total_surcharges
FROM trip_data
GROUP BY distance_tier
ORDER BY CASE distance_tier WHEN 'Short' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END;


-- Test Case TC-OLAP-08: Slice-and-Dice Parameter Variation (Bronx + Credit Card)
-- TC-OLAP-08: Slice & Dice Bronx + Credit Card Verification
WITH trip_data AS (
    SELECT 
        f.fare_amount,
        f.tip_amount,
        f.trip_distance,
        (COALESCE(f.extra,0) + COALESCE(f.mta_tax,0) + COALESCE(f.tolls_amount,0) +
         COALESCE(f.improvement_surcharge,0) + COALESCE(f.congestion_surcharge,0) +
         COALESCE(f.cbd_congestion_fee,0)) AS total_surcharges,
        CASE 
            WHEN f.trip_distance < 3 THEN 'Short'
            WHEN f.trip_distance < 10 THEN 'Medium'
            ELSE 'Long'
        END AS distance_tier
    FROM fact_taxi_trips f
    JOIN dim_date d ON f.pickup_date_key = d.date_key
    JOIN dim_location l ON f.pickup_location_id = l.location_id
    JOIN dim_payment_type p ON f.payment_type_id = p.payment_type_id
    WHERE d.year = 2025 AND l.borough = 'Bronx' AND p.payment_name = 'Credit card' AND f.trip_distance >= 0
)
SELECT 
    distance_tier,
    COUNT(*) AS total_trips,
    ROUND(AVG(fare_amount)::numeric, 2) AS average_fare,
    ROUND((100.0 * SUM(tip_amount) / NULLIF(SUM(fare_amount), 0))::numeric, 2) AS tipping_percentage,
    ROUND(SUM(total_surcharges)::numeric, 2) AS total_surcharges
FROM trip_data
GROUP BY distance_tier
ORDER BY CASE distance_tier WHEN 'Short' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END;