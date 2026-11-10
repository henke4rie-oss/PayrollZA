from decimal import Decimal

import pytest

from api.app.engine import (
    calculate_annual_paye,
    calculate_payroll,
    calculate_rebates,
    calculate_sdl,
    calculate_uif,
    validate_sa_id,
)


# Test the 5 specific anchor scenarios required by the specification
@pytest.mark.parametrize(
    "gross_monthly, age, expected_annual_paye, expected_monthly_paye, expected_uif, expected_net",
    [
        # Anchor 1: gross 10,000, age 30
        # Working: annual = 120,000. Bracket 1: 120,000 * 0.18 = 21,600.
        # Primary rebate = 17,820. Annual PAYE = 21,600 - 17,820 = 3,780.00.
        # Monthly PAYE = 3,780 / 12 = 315.00.
        # UIF = 10,000 * 0.01 = 100.00.
        # Net = 10,000 - 315.00 - 100.00 = 9,585.00.
        (
            Decimal("10000.00"),
            30,
            Decimal("3780.00"),
            Decimal("315.00"),
            Decimal("100.00"),
            Decimal("9585.00"),
        ),
        # Anchor 2: gross 30,000, age 34
        # Working: annual = 360,000.
        # Bracket 2: 44,118 + (360,000 - 245,100) * 0.26 = 44,118 + 29,874 = 73,992.
        # Primary rebate = 17,820. Annual PAYE = 73,992 - 17,820 = 56,172.00.
        # Monthly PAYE = 56,172 / 12 = 4,681.00.
        # UIF ceiling R17,712 applies -> min(30,000, 17,712) * 0.01 = 177.12.
        # Net = 30,000 - 4,681.00 - 177.12 = 25,141.88.
        (
            Decimal("30000.00"),
            34,
            Decimal("56172.00"),
            Decimal("4681.00"),
            Decimal("177.12"),
            Decimal("25141.88"),
        ),
        # Anchor 3: gross 100,000, age 40
        # Working: annual = 1,200,000.
        # Bracket 6: 259,783 + (1,200,000 - 887,000) * 0.41 = 259,783 + 128,330 = 388,113.
        # Primary rebate = 17,820. Annual PAYE = 388,113 - 17,820 = 370,293.00.
        # Monthly PAYE = 370,293 / 12 = 30,857.75.
        # UIF = 177.12.
        # Net = 100,000 - 30,857.75 - 177.12 = 68,965.13.
        (
            Decimal("100000.00"),
            40,
            Decimal("370293.00"),
            Decimal("30857.75"),
            Decimal("177.12"),
            Decimal("68965.13"),
        ),
        # Anchor 4: gross 8,250, age 30
        # Working: annual = 99,000. Tax threshold for under 65 is R99,000.
        # Income <= 99,000 means PAYE = 0.00.
        # UIF = 8,250 * 0.01 = 82.50.
        # Net = 8,250 - 82.50 = 8,167.50.
        (
            Decimal("8250.00"),
            30,
            Decimal("0.00"),
            Decimal("0.00"),
            Decimal("82.50"),
            Decimal("8167.50"),
        ),
        # Anchor 5: gross 14,000, age 65
        # Working: annual = 168,000. Exceeds 65+ threshold of R153,250.
        # Bracket 1: 168,000 * 0.18 = 30,240.
        # Rebates for age 65: primary 17,820 + secondary 9,765 = 27,585.
        # Annual PAYE = 30,240 - 27,585 = 2,655.00.
        # Monthly PAYE = 2,655 / 12 = 221.25.
        # UIF = 14,000 * 0.01 = 140.00.
        # Net = 14,000 - 221.25 - 140.00 = 13,638.75.
        (
            Decimal("14000.00"),
            65,
            Decimal("2655.00"),
            Decimal("221.25"),
            Decimal("140.00"),
            Decimal("13638.75"),
        ),
    ],
)
def test_payroll_checked_anchors(
    gross_monthly,
    age,
    expected_annual_paye,
    expected_monthly_paye,
    expected_uif,
    expected_net,
):
    result = calculate_payroll(gross_monthly, age)
    assert result["annual_paye"] == expected_annual_paye
    assert result["monthly_paye"] == expected_monthly_paye
    assert result["uif_employee"] == expected_uif
    assert result["net_pay"] == expected_net


# Test annual PAYE calculations at every bracket boundary (+- R1) for age 30
@pytest.mark.parametrize(
    "annual_taxable_income, expected_annual_paye",
    [
        # Bracket 1 edge: R245,099 (Bracket 1: 245,099 * 0.18 = 44,117.82 - 17,820 = 26,297.82)
        (Decimal("245099.00"), Decimal("26297.82")),
        # Bracket 1 boundary: R245,100 (245,100 * 0.18 = 44,118.00 - 17,820 = 26,298.00)
        (Decimal("245100.00"), Decimal("26298.00")),
        # Bracket 2 edge: R245,101 (44,118 + 1 * 0.26 = 44,118.26 - 17,820 = 26,298.26)
        (Decimal("245101.00"), Decimal("26298.26")),
        # Bracket 2 edge: R383,099 (44,118 + 137,999 * 0.26 = 79,997.74 - 17,820 = 62,177.74)
        (Decimal("383099.00"), Decimal("62177.74")),
        # Bracket 2 boundary: R383,100 (44,118 + 138,000 * 0.26 = 79,998.00 - 17,820 = 62,178.00)
        (Decimal("383100.00"), Decimal("62178.00")),
        # Bracket 3 edge: R383,101 (79,998 + 1 * 0.31 = 79,998.31 - 17,820 = 62,178.31)
        (Decimal("383101.00"), Decimal("62178.31")),
        # Bracket 3 edge: R530,199 (79,998 + 147,099 * 0.31 = 125,598.69 - 17,820 = 107,778.69)
        (Decimal("530199.00"), Decimal("107778.69")),
        # Bracket 3 boundary: R530,200 (79,998 + 147,100 * 0.31 = 125,599.00 - 17,820 = 107,779.00)
        (Decimal("530200.00"), Decimal("107779.00")),
        # Bracket 4 edge: R530,201 (125,599 + 1 * 0.36 = 125,599.36 - 17,820 = 107,779.36)
        (Decimal("530201.00"), Decimal("107779.36")),
        # Bracket 4 edge: R695,799 (125,599 + 165,599 * 0.36 = 185,214.64 - 17,820 = 167,394.64)
        (Decimal("695799.00"), Decimal("167394.64")),
        # Bracket 4 boundary: R695,800 (125,599 + 165,600 * 0.36 = 185,215.00 - 17,820 = 167,395.00)
        (Decimal("695800.00"), Decimal("167395.00")),
        # Bracket 5 edge: R695,801 (185,215 + 1 * 0.39 = 185,215.39 - 17,820 = 167,395.39)
        (Decimal("695801.00"), Decimal("167395.39")),
        # Bracket 5 edge: R886,999 (185,215 + 191,199 * 0.39 = 259,782.61 - 17,820 = 241,962.61)
        (Decimal("886999.00"), Decimal("241962.61")),
        # Bracket 5 boundary: R887,000 (185,215 + 191,200 * 0.39 = 259,783.00 - 17,820 = 241,963.00)
        (Decimal("887000.00"), Decimal("241963.00")),
        # Bracket 6 edge: R887,001 (259,783 + 1 * 0.41 = 259,783.41 - 17,820 = 241,963.41)
        (Decimal("887001.00"), Decimal("241963.41")),
        # Bracket 6 edge: R1,878,599 (259,783 + 991,599 * 0.41 = 666,338.59 - 17,820 = 648,518.59)
        (Decimal("1878599.00"), Decimal("648518.59")),
        # Bracket 6 boundary: R1,878,600 (259,783 + 991,600 * 0.41 = 666,339.00 - 17,820 = 648,519.00)
        (Decimal("1878600.00"), Decimal("648519.00")),
        # Bracket 7 edge: R1,878,601 (666,339 + 1 * 0.45 = 666,339.45 - 17,820 = 648,519.45)
        (Decimal("1878601.00"), Decimal("648519.45")),
    ],
)
def test_bracket_boundaries(annual_taxable_income, expected_annual_paye):
    paye, _, _, _ = calculate_annual_paye(annual_taxable_income, 30)
    assert paye == expected_annual_paye


# Test statutory tax thresholds and edge cases (+- R1) for each age tier
@pytest.mark.parametrize(
    "annual_income, age, expected_paye, expected_is_below_threshold",
    [
        # Under 65: threshold R99,000
        # R98,999 is below threshold -> 0 tax
        (Decimal("98999.00"), 30, Decimal("0.00"), True),
        # Exactly R99,000 is at threshold -> 0 tax
        (Decimal("99000.00"), 30, Decimal("0.00"), True),
        # R99,001 is above threshold: 99,001 * 0.18 = 17,820.18 - 17,820 = 0.18
        (Decimal("99001.00"), 30, Decimal("0.18"), False),
        # Age 65 to 74: threshold R153,250 (rebates: 17,820 + 9,765 = 27,585)
        # R153,249 is below threshold -> 0 tax
        (Decimal("153249.00"), 68, Decimal("0.00"), True),
        # Exactly R153,250 is at threshold -> 0 tax
        (Decimal("153250.00"), 68, Decimal("0.00"), True),
        # R153,251 is above threshold: 153,251 * 0.18 = 27,585.18 - 27,585 = 0.18
        (Decimal("153251.00"), 68, Decimal("0.18"), False),
        # Age 75 and over: threshold R171,300 (rebates: 17,820 + 9,765 + 3,249 = 30,834)
        # R171,299 is below threshold -> 0 tax
        (Decimal("171299.00"), 76, Decimal("0.00"), True),
        # Exactly R171,300 is at threshold -> 0 tax
        (Decimal("171300.00"), 76, Decimal("0.00"), True),
        # R171,301 is above threshold: 171,301 * 0.18 = 30,834.18 - 30,834 = 0.18
        (Decimal("171301.00"), 76, Decimal("0.18"), False),
    ],
)
def test_tax_thresholds_and_edges(annual_income, age, expected_paye, expected_is_below_threshold):
    paye, _, is_below, _ = calculate_annual_paye(annual_income, age)
    assert paye == expected_paye
    assert is_below == expected_is_below_threshold


# Test age rebate tiers: primary, secondary, tertiary
@pytest.mark.parametrize(
    "age, expected_primary, expected_secondary, expected_tertiary, expected_total",
    [
        (25, Decimal("17820.00"), Decimal("0.00"), Decimal("0.00"), Decimal("17820.00")),
        (64, Decimal("17820.00"), Decimal("0.00"), Decimal("0.00"), Decimal("17820.00")),
        (65, Decimal("17820.00"), Decimal("9765.00"), Decimal("0.00"), Decimal("27585.00")),
        (74, Decimal("17820.00"), Decimal("9765.00"), Decimal("0.00"), Decimal("27585.00")),
        (75, Decimal("17820.00"), Decimal("9765.00"), Decimal("3249.00"), Decimal("30834.00")),
        (85, Decimal("17820.00"), Decimal("9765.00"), Decimal("3249.00"), Decimal("30834.00")),
    ],
)
def test_rebates_by_age(age, expected_primary, expected_secondary, expected_tertiary, expected_total):
    primary, secondary, tertiary, total = calculate_rebates(age)
    assert primary == expected_primary
    assert secondary == expected_secondary
    assert tertiary == expected_tertiary
    assert total == expected_total


# Test UIF monthly ceiling (R17,712 -> R177.12 max)
@pytest.mark.parametrize(
    "gross_monthly, expected_employee_uif, expected_employer_uif",
    [
        (Decimal("5000.00"), Decimal("50.00"), Decimal("50.00")),
        (Decimal("17711.00"), Decimal("177.11"), Decimal("177.11")),
        (Decimal("17712.00"), Decimal("177.12"), Decimal("177.12")),
        (Decimal("17713.00"), Decimal("177.12"), Decimal("177.12")),
        (Decimal("50000.00"), Decimal("177.12"), Decimal("177.12")),
    ],
)
def test_uif_ceiling(gross_monthly, expected_employee_uif, expected_employer_uif):
    emp, empr = calculate_uif(gross_monthly)
    assert emp == expected_employee_uif
    assert empr == expected_employer_uif


# Test Skills Development Levy (SDL) calculation and employer exemption
@pytest.mark.parametrize(
    "gross_monthly, sdl_exempt, expected_sdl",
    [
        (Decimal("20000.00"), False, Decimal("200.00")),
        (Decimal("20000.00"), True, Decimal("0.00")),
        (Decimal("0.00"), False, Decimal("0.00")),
    ],
)
def test_sdl_calculation_and_exemption(gross_monthly, sdl_exempt, expected_sdl):
    assert calculate_sdl(gross_monthly, sdl_exempt=sdl_exempt) == expected_sdl


# Test zero salary returns zeroes without error
def test_zero_salary():
    result = calculate_payroll(Decimal("0.00"), 30)
    assert result["gross_monthly"] == Decimal("0.00")
    assert result["monthly_paye"] == Decimal("0.00")
    assert result["uif_employee"] == Decimal("0.00")
    assert result["net_pay"] == Decimal("0.00")


# Test input validation errors for negative salary and invalid age
@pytest.mark.parametrize(
    "gross, age, expected_message",
    [
        (Decimal("-100.00"), 30, "Gross monthly salary cannot be negative"),
        (Decimal("10000.00"), 15, "Age must be between 16 and 100"),
        (Decimal("10000.00"), 101, "Age must be between 16 and 100"),
    ],
)
def test_payroll_input_validation_errors(gross, age, expected_message):
    with pytest.raises(ValueError) as excinfo:
        calculate_payroll(gross, age)
    assert str(excinfo.value) == expected_message


# Test South African ID number validation
@pytest.mark.parametrize(
    "id_number, expected_valid, expected_gender, expected_citizen, expected_error_substring",
    [
        # Valid ID 1: Born 01 Jan 1980, Male (5009 >= 5000), Citizen ('0'), Checksum 7
        ("8001015009087", True, "M", True, None),
        # Valid ID 2: Born 15 Jan 1988, Male (5029 >= 5000), Citizen ('0'), Checksum 8
        ("8801155029088", True, "M", True, None),
        # Valid ID 3: Born 14 Aug 2003, Female (0029 < 5000), Citizen ('0'), Checksum 0
        ("0308140029080", True, "F", True, None),
        # Bad checksum (last digit intentionally changed from 7 to 4)
        ("8001015009084", False, None, None, "checksum"),
        # Bad length (12 digits)
        ("880115502908", False, None, None, "13 digits"),
        # Bad length (14 digits)
        ("88011550290844", False, None, None, "13 digits"),
        # Bad date (February 31)
        ("8802315029084", False, None, None, "birth date"),
        # Non-digits included
        ("880115502908A", False, None, None, "13 digits"),
    ],
)
def test_sa_id_validation(
    id_number,
    expected_valid,
    expected_gender,
    expected_citizen,
    expected_error_substring,
):
    result = validate_sa_id(id_number)
    assert result["is_valid"] == expected_valid
    if expected_valid:
        assert result["gender"] == expected_gender
        assert result["is_citizen"] == expected_citizen
        assert result["error"] is None
    else:
        assert expected_error_substring in result["error"]
