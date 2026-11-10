import json
from datetime import date
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path
from typing import Any


# Round any decimal value half-up to two decimal places for cents
def round_cents(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


# Load the official SARS 2026/27 tax table from the JSON file
def load_tax_table(file_path: Path | None = None) -> dict[str, Any]:
    if file_path is None:
        file_path = Path(__file__).resolve().parent / "tax_tables" / "2026_27.json"
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


# Cache the tax table data so we only read the file once
TAX_TABLE = load_tax_table()


# Calculate statutory tax rebates based on employee age
def calculate_rebates(age: int) -> tuple[Decimal, Decimal, Decimal, Decimal]:
    rebates_data = TAX_TABLE["rebates"]
    primary = Decimal(rebates_data["primary"])
    secondary = Decimal(rebates_data["secondary"]) if age >= 65 else Decimal("0.00")
    tertiary = Decimal(rebates_data["tertiary"]) if age >= 75 else Decimal("0.00")
    total = primary + secondary + tertiary
    return primary, secondary, tertiary, total


# Get the tax-free income threshold for an employee's age
def get_tax_threshold(age: int) -> Decimal:
    thresholds = TAX_TABLE["tax_thresholds"]
    if age >= 75:
        return Decimal(thresholds["age_75_and_over"])
    if age >= 65:
        return Decimal(thresholds["age_65_to_74"])
    return Decimal(thresholds["under_65"])


# Calculate annual PAYE before subtracting rebates
def calculate_annual_tax_before_rebates(taxable_income: Decimal) -> tuple[Decimal, Decimal]:
    if taxable_income <= Decimal("0.00"):
        return Decimal("0.00"), Decimal("0.18")

    brackets = TAX_TABLE["brackets"]
    for bracket in brackets:
        from_val = Decimal(bracket["threshold_from"])
        to_val = Decimal(bracket["threshold_to"]) if bracket["threshold_to"] else None
        base_tax = Decimal(bracket["base_tax"])
        rate = Decimal(bracket["rate"])

        # Check if the income falls within this bracket
        if to_val is None or taxable_income <= to_val:
            excess = taxable_income - from_val
            tax = base_tax + (excess * rate)
            return tax, rate

    # Fallback to the top bracket if no upper bound was matched
    last_bracket = brackets[-1]
    from_val = Decimal(last_bracket["threshold_from"])
    base_tax = Decimal(last_bracket["base_tax"])
    rate = Decimal(last_bracket["rate"])
    tax = base_tax + ((taxable_income - from_val) * rate)
    return tax, rate


# Calculate net annual PAYE after applying rebates and threshold checks
def calculate_annual_paye(taxable_income: Decimal, age: int) -> tuple[Decimal, Decimal, bool, Decimal]:
    threshold = get_tax_threshold(age)

    # If annual taxable income is at or below the threshold, no PAYE is due
    if taxable_income <= threshold:
        _, _, _, total_rebates = calculate_rebates(age)
        tax_before, rate = calculate_annual_tax_before_rebates(taxable_income)
        return Decimal("0.00"), total_rebates, True, rate

    tax_before, rate = calculate_annual_tax_before_rebates(taxable_income)
    _, _, _, total_rebates = calculate_rebates(age)
    tax_after = max(Decimal("0.00"), tax_before - total_rebates)
    return round_cents(tax_after), total_rebates, False, rate


# Calculate UIF deductions for employee and employer with monthly ceiling
def calculate_uif(gross_monthly: Decimal) -> tuple[Decimal, Decimal]:
    uif_cfg = TAX_TABLE["uif"]
    employee_rate = Decimal(uif_cfg["employee_rate"])
    employer_rate = Decimal(uif_cfg["employer_rate"])
    ceiling = Decimal(uif_cfg["monthly_ceiling"])

    uif_income = min(gross_monthly, ceiling)
    uif_employee = round_cents(uif_income * employee_rate)
    uif_employer = round_cents(uif_income * employer_rate)
    return uif_employee, uif_employer


# Calculate Skills Development Levy (1% of gross, 0 if employer is exempt)
def calculate_sdl(gross_monthly: Decimal, sdl_exempt: bool = False) -> Decimal:
    if sdl_exempt:
        return Decimal("0.00")
    rate = Decimal(TAX_TABLE["sdl"]["rate"])
    return round_cents(gross_monthly * rate)


# Stub for the Employment Tax Incentive (ETI)
def calculate_eti(gross_monthly: Decimal, age: int) -> Decimal:
    # TODO: implement ETI calculation based on 2026/27 rules
    return Decimal("0.00")


# Complete monthly payroll calculation for a single employee
def calculate_payroll(
    gross_monthly: Decimal,
    age: int,
    sdl_exempt: bool = False,
) -> dict[str, Any]:
    # Validate inputs
    if gross_monthly < Decimal("0.00"):
        raise ValueError("Gross monthly salary cannot be negative")
    if age < 16 or age > 100:
        raise ValueError("Age must be between 16 and 100")

    annual_gross = round_cents(gross_monthly * Decimal(12))
    annual_paye, total_rebates, is_below_threshold, marginal_rate = calculate_annual_paye(annual_gross, age)

    # Monthly PAYE is annual PAYE divided by 12, rounded half-up
    monthly_paye = round_cents(annual_paye / Decimal(12))

    uif_employee, uif_employer = calculate_uif(gross_monthly)
    sdl_amount = calculate_sdl(gross_monthly, sdl_exempt=sdl_exempt)
    eti_amount = calculate_eti(gross_monthly, age)

    # Net pay is gross minus employee deductions
    net_pay = round_cents(gross_monthly - monthly_paye - uif_employee)

    # Total cost to company includes gross plus employer levies
    total_employer_cost = round_cents(gross_monthly + uif_employer + sdl_amount)

    primary_rebate, secondary_rebate, tertiary_rebate, _ = calculate_rebates(age)

    return {
        "gross_monthly": round_cents(gross_monthly),
        "annual_gross": annual_gross,
        "age": age,
        "taxable_income_annual": annual_gross,
        "annual_paye": annual_paye,
        "monthly_paye": monthly_paye,
        "primary_rebate": primary_rebate,
        "secondary_rebate": secondary_rebate,
        "tertiary_rebate": tertiary_rebate,
        "total_rebates": total_rebates,
        "uif_employee": uif_employee,
        "uif_employer": uif_employer,
        "sdl_amount": sdl_amount,
        "eti_amount": eti_amount,
        "net_pay": net_pay,
        "total_employer_cost": total_employer_cost,
        "marginal_rate": marginal_rate,
        "is_below_threshold": is_below_threshold,
    }


# Validate a South African 13-digit ID number using the DHA Luhn algorithm
def validate_sa_id(id_number: str) -> dict[str, Any]:
    cleaned = "".join(id_number.split())

    if len(cleaned) != 13 or not cleaned.isdigit():
        return {
            "is_valid": False,
            "error": "SA ID must be exactly 13 digits.",
            "age": None,
            "gender": None,
            "is_citizen": None,
            "birth_date": None,
        }

    # Decode birth date
    yy = int(cleaned[0:2])
    mm = int(cleaned[2:4])
    dd = int(cleaned[4:6])

    today = date.today()
    current_yy = today.year % 100
    century = 1900 if yy > current_yy else 2000
    birth_year = century + yy

    try:
        birth_date = date(birth_year, mm, dd)
    except ValueError:
        return {
            "is_valid": False,
            "error": "Invalid birth date encoded in ID number.",
            "age": None,
            "gender": None,
            "is_citizen": None,
            "birth_date": None,
        }

    # Step 1: Sum digits in odd positions (0-indexed: 0, 2, 4, 6, 8, 10)
    sum_odd = sum(int(cleaned[i]) for i in range(0, 11, 2))

    # Step 2: Concatenate digits in even positions (1-indexed: 1, 3, 5, 7, 9, 11) and multiply by 2
    even_str = "".join(cleaned[i] for i in range(1, 12, 2))
    even_product = str(int(even_str) * 2)
    sum_even = sum(int(digit) for digit in even_product)

    # Step 3: Check digit verification
    total = sum_odd + sum_even
    expected_check_digit = (10 - (total % 10)) % 10
    actual_check_digit = int(cleaned[12])

    if actual_check_digit != expected_check_digit:
        return {
            "is_valid": False,
            "error": "Invalid SA ID checksum (DHA algorithm check failed).",
            "age": None,
            "gender": None,
            "is_citizen": None,
            "birth_date": None,
        }

    # Calculate current age
    age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))

    # Gender: digits 6 to 9 (0000-4999 = Female, 5000-9999 = Male)
    gender_digits = int(cleaned[6:10])
    gender = "M" if gender_digits >= 5000 else "F"

    # Citizenship: digit 10 (0 = SA Citizen, 1 = Permanent Resident)
    is_citizen = cleaned[10] == "0"

    return {
        "is_valid": True,
        "birth_date": birth_date.isoformat(),
        "age": age,
        "gender": gender,
        "is_citizen": is_citizen,
        "error": None,
    }
