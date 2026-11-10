# PayrollZA - South African Payroll & Statutory Compliance Prototype

A South African statutory payroll prototype for SME employers and accounting practices. It calculates PAYE, UIF, SDL, and BCEA Section 33 payslips, provides SARS EMP201 reconciliation schedules, and exports batch EFT payment files.

> **Architecture Note:** The Python FastAPI backend (`api/`) is the future single source of truth for all statutory calculations and persistence. It is currently developed and tested in isolation with full test coverage before wiring directly to the React frontend.

---

## Quick Start

### 1. React Frontend
Requires Node.js 18+:
```bash
npm install
npm run dev
```
The web application runs on `http://localhost:3000`.

### 2. Python API (FastAPI + PostgreSQL)
#### Option A: Docker Compose (Recommended)
```bash
cd api
docker compose up --build
```
This boots:
- PostgreSQL 16 on port `5432` (container `payrollza_postgres`)
- FastAPI application on `http://localhost:8000` (container `payrollza_api`), with auto-migrations via Alembic.
- Interactive docs available at `http://localhost:8000/docs`.

#### Option B: Local Environment
```bash
cd api
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn api.app.main:app --reload --port 8000
```

---

## Running Test Suites

### React / TypeScript Tests
Runs unit tests for SARS calculation rules, DHA 13-digit Luhn verification, birthday age derivations, IDOR tenant boundary checks, and bank batch exports:
```bash
npx tsx --test src/utils/*.test.ts
```

### Python API Tests
Runs 68 tests covering SARS 2026/27 bracket edges (±R1), rebates, thresholds, UIF ceiling, SDL exemption, and FastAPI endpoints:
```bash
PYTHONPATH=. pytest -v api/tests
```

Linting with ruff:
```bash
ruff check api
```

---

## SARS 2026/2027 Statutory Table Summary

- **Tax Brackets (Taxable income / Base Tax / Marginal Rate):**
  - R0 – R245,100: 18% of taxable income
  - R245,101 – R383,100: R44,118 + 26% of excess above R245,100
  - R383,101 – R530,200: R79,998 + 31% of excess above R383,100
  - R530,201 – R695,800: R125,599 + 36% of excess above R530,200
  - R695,801 – R887,000: R185,215 + 39% of excess above R695,800
  - R887,001 – R1,878,600: R259,783 + 41% of excess above R887,000
  - R1,878,601 and above: R666,339 + 45% of excess above R1,878,600
- **Tax Rebates:**
  - Primary (all natural persons): R17,820
  - Secondary (age 65 and over): R9,765
  - Tertiary (age 75 and over): R3,249
- **Tax Thresholds:**
  - Under 65: R99,000
  - Age 65 to 74: R153,250
  - Age 75 and over: R171,300
- **UIF (Unemployment Insurance Fund):**
  - 1% employee deduction + 1% employer contribution
  - Monthly remuneration ceiling: R17,712 (maximum deduction R177.12 each)
- **SDL (Skills Development Levy):**
  - 1% of gross remuneration paid by employer
  - Exemption: Employers with total annual remuneration under R500,000
- **ETI (Employment Tax Incentive):**
  - Youth incentive stub (verified against SARS rules)
