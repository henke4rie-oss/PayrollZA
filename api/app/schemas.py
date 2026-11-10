from decimal import Decimal

from pydantic import BaseModel, Field


# Request schema for single employee payroll calculation
class PayrollCalculationRequest(BaseModel):
    gross_monthly: Decimal = Field(..., description="Gross monthly remuneration in South African Rands")
    age: int = Field(..., description="Employee age in years")
    sdl_exempt: bool = Field(False, description="Whether the employer is exempt from Skills Development Levy")


# Response schema for payroll calculation breakdown
class PayrollCalculationResponse(BaseModel):
    gross_monthly: Decimal
    annual_gross: Decimal
    age: int
    taxable_income_annual: Decimal
    annual_paye: Decimal
    monthly_paye: Decimal
    primary_rebate: Decimal
    secondary_rebate: Decimal
    tertiary_rebate: Decimal
    total_rebates: Decimal
    uif_employee: Decimal
    uif_employer: Decimal
    sdl_amount: Decimal
    eti_amount: Decimal
    net_pay: Decimal
    total_employer_cost: Decimal
    marginal_rate: Decimal
    is_below_threshold: bool


# Request schema for South African ID validation
class SaIdValidationRequest(BaseModel):
    id_number: str = Field(..., description="13-digit South African ID number")


# Response schema for South African ID validation
class SaIdValidationResponse(BaseModel):
    is_valid: bool
    birth_date: str | None = None
    age: int | None = None
    gender: str | None = None
    is_citizen: bool | None = None
    error: str | None = None


# Health check response schema
class HealthResponse(BaseModel):
    status: str
    database: str
