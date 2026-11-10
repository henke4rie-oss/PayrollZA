from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from api.app.database import check_database_health
from api.app.engine import calculate_payroll, validate_sa_id
from api.app.schemas import (
    HealthResponse,
    PayrollCalculationRequest,
    PayrollCalculationResponse,
    SaIdValidationRequest,
    SaIdValidationResponse,
)

# Initialize the FastAPI application
app = FastAPI(
    title="4mula API",
    version="1.0.0",
    description="South African Statutory Payroll & Tax Compliance API",
)

# Allow CORS for client development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint that pings PostgreSQL
@app.get("/health", response_model=HealthResponse, tags=["Health"])
def health_check():
    db_status = check_database_health()
    return HealthResponse(
        status="ok",
        database=db_status,
    )


# Calculate monthly payroll and statutory deductions for an employee
@app.post(
    "/payroll/calculate",
    response_model=PayrollCalculationResponse,
    status_code=status.HTTP_200_OK,
    tags=["Payroll"],
)
def calculate_employee_payroll(payload: PayrollCalculationRequest):
    try:
        result = calculate_payroll(
            gross_monthly=payload.gross_monthly,
            age=payload.age,
            sdl_exempt=payload.sdl_exempt,
        )
        return PayrollCalculationResponse(**result)
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err),
        )


# Validate a South African 13-digit identity number
@app.post(
    "/sa-id/validate",
    response_model=SaIdValidationResponse,
    status_code=status.HTTP_200_OK,
    tags=["Identity"],
)
def validate_identity_number(payload: SaIdValidationRequest):
    result = validate_sa_id(payload.id_number)
    return SaIdValidationResponse(**result)
