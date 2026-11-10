# 4mula - Python Payroll & Statutory API (repo: PayrollZA)

This is the single source of truth backend for South African payroll calculations, statutory compliance, and identity validation.

## Tech Stack
- **Python 3.12**
- **FastAPI** (high-performance web framework)
- **Pydantic v2** (request validation and response schemas)
- **SQLAlchemy 2.0** (ORM and database session management)
- **Alembic** (database migrations)
- **PostgreSQL 16** (relational database)
- **Docker & Docker Compose** (containerization and service orchestration)
- **pytest** (unit and API test suite)
- **ruff** (fast Python linter and formatter)

---

## Key Principles & Business Rules
1. **Decimal Precision**: All currency and financial amounts use `decimal.Decimal` rounded half-up (`ROUND_HALF_UP`) to 2 decimal places. Floating-point numbers are strictly forbidden.
2. **Tax Tables as Data**: Tax brackets, age rebates, and thresholds are not hard-coded in Python. They are loaded dynamically from `api/app/tax_tables/2026_27.json`.
3. **Multi-Tenant Architecture**: Every database table includes an indexed `tenant_id` column to ensure strict organization isolation.

---

## Quick Start with Docker Compose

### 1. Copy Environment Variables
```bash
cp api/.env.example api/.env
```

### 2. Start Services
From the repository root or inside `api/`:
```bash
cd api
docker compose up --build
```

This starts:
- **db**: PostgreSQL 16 on port `5432` with a persistent Docker volume and healthcheck.
- **web**: FastAPI application on port `8000`. It automatically waits for PostgreSQL to become healthy and runs `alembic upgrade head` before serving requests.

Interactive Swagger API documentation will be available at:
`http://localhost:8000/docs`

---

## Running Locally Without Docker

### 1. Create a Virtual Environment
```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r api/requirements.txt
```

### 2. Run Database Migrations
```bash
cd api
alembic upgrade head
```

### 3. Start the Development Server
```bash
uvicorn api.app.main:app --reload --port 8000
```

---

## Running Tests

Run the test suite with pytest from the repository root:
```bash
PYTHONPATH=. pytest -v api/tests
```

Run linting with ruff:
```bash
ruff check api
```

---

## API Endpoints

### 1. Health Check
`GET /health`

Pings the PostgreSQL database and reports service health.

**Response (200 OK):**
```json
{
  "status": "ok",
  "database": "healthy"
}
```

---

### 2. Calculate Payroll
`POST /payroll/calculate`

Calculates monthly PAYE, UIF, SDL, ETI, net pay, and statutory breakdown for an employee using the official SARS 2026/27 tables.

**Request Body:**
```json
{
  "gross_monthly": "30000.00",
  "age": 34,
  "sdl_exempt": false
}
```

**Response (200 OK):**
```json
{
  "gross_monthly": "30000.00",
  "annual_gross": "360000.00",
  "age": 34,
  "taxable_income_annual": "360000.00",
  "annual_paye": "56172.00",
  "monthly_paye": "4681.00",
  "primary_rebate": "17820.00",
  "secondary_rebate": "0.00",
  "tertiary_rebate": "0.00",
  "total_rebates": "17820.00",
  "uif_employee": "177.12",
  "uif_employer": "177.12",
  "sdl_amount": "300.00",
  "eti_amount": "0.00",
  "net_pay": "25141.88",
  "total_employer_cost": "30477.12",
  "marginal_rate": "0.26",
  "is_below_threshold": false
}
```

**Validation Errors:**
- Returns `400 Bad Request` if `gross_monthly < 0` or if `age < 16` or `age > 100`.
- Returns `422 Unprocessable Entity` if inputs fail schema validation.

---

### 3. Validate South African ID
`POST /sa-id/validate`

Validates a 13-digit South African ID number using the Department of Home Affairs (DHA) Luhn algorithm, extracting birth date, current age, gender, and citizenship.

**Request Body:**
```json
{
  "id_number": "8001015009087"
}
```

**Response (200 OK):**
```json
{
  "is_valid": true,
  "birth_date": "1980-01-01",
  "age": 46,
  "gender": "M",
  "is_citizen": true,
  "error": null
}
```
