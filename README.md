# NYC Green Taxi OLAP Data Warehouse & Performance Benchmarking

> **Members:** Co, Go, Lim, Uy
> 
> **Live Application:** [https://olapp-application.onrender.com/](https://olapp-application.onrender.com/)

A complete OLAP (Online Analytical Processing) data warehouse solution built with PostgreSQL and Docker for analyzing NYC Green Taxi trip datasets. This project features a custom Python ETL pipeline, a dimensional Star Schema, automated functional validation tests, and performance benchmarking across core OLAP analytical operations.

---

## Project Architecture

The application is containerized using Docker Compose, separating the database storage engine from the Python execution environment.

- **Deployment URL:** [https://olapp-application.onrender.com/](https://olapp-application.onrender.com/)
- **Database Container:** `olapp-application-db-1`
- **Database Engine:** PostgreSQL 16
- **Database Port:** Host port `5433`, mapped to container port `5432`
- **Application Server Container:** `olapp-application-server-1`
- **Runtime:** Python 3.10+
- **Target Database:** `olapp`
- **Default Database User:** `postgres`

## Dimensional Schema Design

The warehouse implements a classic **Star Schema** centered around the `fact_taxi_trips` fact table, containing **591,483 integrated records**, surrounded by six dimensional lookup tables.

### Star Schema Diagram

```text
               +--------------------+
               |      dim_date      |
               +--------------------+
                         |
+------------------+     |     +--------------------+
| dim_payment_type |     |     |   dim_location     |
+------------------+     |     +--------------------+
         \               |               /
          \              |              /
         +----------------------------------+
         |         fact_taxi_trips          |
         +----------------------------------+
          /              |              \
         /               |               \
+------------------+     |     +--------------------+
|    dim_vendor    |     |     |   dim_rate_code    |
+------------------+     |     +--------------------+
                         |
               +--------------------+
               |      dim_time      |
               +--------------------+
```

### Schema Summary

| Table Name | Entity Type | Grain / Record Count | Description |
|---|---|---|---|
| `fact_taxi_trips` | Fact Table | 591,483 records | Individual Green Taxi trips with monetary metrics and dimension foreign keys. |
| `dim_date` | Dimension | Daily records | Calendar dimensions, including year, quarter, month, weekday, and day name. |
| `dim_time` | Dimension | Minute-by-minute | Intraday temporal dimensions, including hour, minute, and time band. |
| `dim_location` | Dimension | 265 taxi zones | NYC spatial lookup containing borough, zone, and service zone. |
| `dim_vendor` | Dimension | Categorical | Taxi provider mappings, such as VeriFone and Creative Mobile. |
| `dim_rate_code` | Dimension | Categorical | Rate codes, including Standard, JFK, Newark, Negotiated, and Group. |
| `dim_payment_type` | Dimension | Categorical | Payment methods, including credit card, cash, no charge, and dispute. |

## ETL Pipeline Architecture

The ETL pipeline is implemented in Python using Pandas and SQLAlchemy. It executes five distinct stages:

1. **Extraction:** Ingests raw NYC Green Taxi trip CSV files and official TLC location lookup tables.
2. **Timestamp and Temporal Parsing:** Extracts timestamps into discrete surrogate date and time lookup keys (`date_key` and `time_key`).
3. **Key Mapping and Foreign Key Resolution:** Maps vendor IDs, rate codes, location zone IDs, and payment codes to the corresponding dimension table keys.
4. **Measure Cleansing and Anomaly Removal:** Handles invalid values, such as negative trip distances and invalid passenger counts, by setting them to zero or null as appropriate. Monetary values are also standardized.
5. **Spatial Defaulting and Batch Loading:** Assigns missing spatial location codes to default key `264` ("Unknown") to prevent orphaned records, then loads the transformed data into PostgreSQL in optimized memory chunks.

## Repository Structure

```text
## Repository Structure

```text
olAPP-application/
├── data/
│   ├── green_taxi_data.csv
│   └── taxi_zone_lookup.csv
├── db/
│   ├── password.txt
│   ├── schema.sql
│   ├── seed.sql
│   └── test_script.sql
├── docs/
│   ├── .gitignore
│   ├── conf.py
│   ├── index.rst
│   ├── make.bat
│   └── Makefile
├── olap_frontend/
│   └── olapp/
│       ├── public/
│       ├── src/
│       ├── .gitignore
│       ├── .oxlintrc.json
│       ├── components.json
│       ├── index.html
│       ├── package-lock.json
│       ├── package.json
│       ├── tsconfig.app.json
│       ├── tsconfig.json
│       ├── tsconfig.node.json
│       └── vite.config.ts
├── src/
│   └── olapp_application/
│       ├── __init__.py
│       ├── app.py
│       ├── database.py
│       ├── etl.py
│       ├── models.py
│       └── settings.py
├── .dockerignore
├── .env
├── .gitignore
├── .python-version
├── compose.yaml
├── Dockerfile
├── LICENSE.md
├── package-lock.json
├── package.json
├── pyproject.toml
├── README.Docker.md
├── README.md
├── requirements.txt
└── uv.lock
```

### Directory Overview

- **`data/`** — Contains the NYC Green Taxi trip dataset and taxi zone lookup CSV file.
- **`db/`** — Contains the database schema, seed data, test script, and database password file.
- **`docs/`** — Contains documentation configuration and build files.
- **`olap_frontend/olapp/`** — Contains the frontend application, including its public assets, source code, and Vite/TypeScript configuration.
- **`src/olapp_application/`** — Contains the Python backend, including the application entry point, database connection logic, ETL pipeline, data models, and settings.
- **`compose.yaml`** — Defines the Docker Compose services and application environment.
- **`Dockerfile`** — Defines the application container image.
- **`pyproject.toml`** — Contains Python project configuration and dependency metadata.
- **`requirements.txt`** — Lists Python dependencies.
- **`uv.lock`** — Locks Python dependencies managed by `uv`.
- **`README.Docker.md`** — Provides Docker-specific documentation.
- **`README.md`** — Main project documentation.

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.
- [Git](https://git-scm.com/) installed.
- Optional: [Visual Studio Code](https://code.visualstudio.com/) with a PostgreSQL extension or a database GUI client such as DBeaver or pgAdmin.

### Environment Setup and Docker Startup

#### 1. Clone the Repository

Replace `your-username` with the actual GitHub username or organization that owns the repository.

```bash
git clone https://github.com/your-username/olAPP-application.git
cd olAPP-application
```

#### 2. Start the Docker Containers

Launch the database and application containers in detached mode:

```bash
docker compose up -d
```

#### 3. Verify the Running Containers

```bash
docker ps
```

Confirm that the database container is running and healthy, with host port `5433` mapped to container port `5432`.

### Performance Execution Summary

| OLAP Query | Optimization Technique | Baseline Cost | Optimized Cost | Baseline Runtime | Optimized Runtime | Execution Plan | Rows Returned | Verdict |
|---|---|---|---|---|---|---|---:|---|
| **1. Roll-Down (Roll-Up)** | SQL reformulation using non-recursive CTEs | `15002.75..15142.01` | `15002.75..15142.01` | 46.48 ms | 50.29 ms | Parallel Seq Scan → Parallel Seq Scan | 20 | **Not Successful** (+8.2% slower) |
| **2. Drill-Down** | Single-column B-tree index on `lpep_pickup_datetime` | `14611.67..15207.89` | `14469.02..14477.15` | 287.26 ms | ~20–97 ms | Parallel Seq Scan → Bitmap Index Scan | 1,785 | **Successful** (reported 66–93% speedup) |
| **3. Slice** | SQL reformulation and secondary indexing | `14495.85..14538.17` | `14495.85..14538.71` | 141.03 ms | 162.34 ms | Parallel Seq Scan → Parallel Seq Scan | 12 | **Not Successful** (+15.1% slower) |
| **4. Slice-and-Dice** | Multi-column composite B-tree index | `15165.90..15166.66` | `15143.83..15144.37` | 96.37 ms | 76.49 ms | Parallel Seq Scan → Parallel Seq Scan | 3 | **Inconclusive** (shared buffer cache artifact) |

---

## Project Highlights

- Designed a dimensional Star Schema with one fact table and six dimension tables.
- Implemented a five-stage ETL pipeline for data extraction, transformation, cleansing, key mapping, and loading.
- Integrated 591,483 NYC Green Taxi trip records into a PostgreSQL data warehouse.
- Developed 12 functional validation assertions for data integrity and analytical correctness.
- Benchmarked four OLAP query patterns and evaluated indexing and SQL reformulation strategies.
- Containerized the application environment using Docker Compose.
- Built a live application interface for interacting with the project.
