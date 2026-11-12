# PayrollZA — Statutory Payroll & Tax Engine

![CI](https://github.com/henke4rie-oss/PayrollZA/actions/workflows/ci.yml/badge.svg)

A Python backend API for South African statutory payroll calculations (PAYE, UIF, SDL) built against the **SARS 2026/27** tax tables. Engineered for deterministic financial accuracy, isolated fiscal rules, and strict boundary testing.

## Tech Stack
* **Backend:** Python 3.12, FastAPI, Pydantic v2, SQLAlchemy, Alembic
* **Database & Infra:** PostgreSQL 16, Docker Compose, GitHub Actions (CI)
* **Testing & Linting:** pytest, Ruff

## Key Engineering Decisions
* **Exact Financial Math:** Uses Python's `Decimal` with explicit rounding rules across all tax brackets, rebates, and statutory caps—eliminating binary floating-point drift.
* **Data-Driven Tax Tables:** SARS brackets, age-based rebates, UIF ceilings, and SDL thresholds live in versioned JSON (`api/app/tax_tables/2026_27.json`). Updating tax years requires zero changes to core calculation logic.
* **SA ID Validation:** Implements Luhn checksum verification and extracts birthdates to automatically apply primary, secondary (65+), and tertiary (75+) tax rebates.
* **Edge-Case Test Coverage:** 85 unit and integration tests covering ±R1 tax bracket boundaries, UIF monthly caps (R17,712), SDL R500k payroll exemptions, and FastAPI endpoints.

## Quick Start

### Docker (Recommended)
```bash
cd api
docker compose up --build
```
Starts Postgres (`4mula_postgres`) and the API (`4mula_api`) on port 8000. Migrations run automatically. Interactive docs: http://localhost:8000/docs

### Endpoints
| Method | Path | What it does |
|---|---|---|
| GET | `/health` | Service and DB health check |
| POST | `/payroll/calculate` | PAYE, UIF and SDL calculation |
| POST | `/sa-id/validate` | SA ID checksum validation and birthdate extraction |
| GET | `/compliance/calendar.ics` | Statutory deadline calendar (7th-of-month rule, weekend rollback) |

### Tests
```bash
PYTHONPATH=. pytest -v api/tests
```
85 tests, all passing in CI. Ruff lint runs on every push.

## Scope and Limitations
* **ETI (Employment Tax Incentive) is not implemented.** The engine covers PAYE, UIF and SDL only.
* **`web/` is an AI-assisted front-end prototype.** The billing, security and ownership screens are mock UI with no backend behind them. The Python API is the actual project.

### Running the prototype (optional)
```bash
cd web
npm install
npm run dev
```
Opens on http://localhost:3000. Tests: `npm test`.