"""South African tax calculator (PAYE, UIF, SDL).

Implements BaseTax using SARS tax tables loaded from a JSON
config file. When SARS publishes new brackets each March,
you update the JSON file — zero Python code changes needed.
"""

import json
import re
from datetime import date
from pathlib import Path

from payrollza.errors import InvalidSalaryError, TaxCalculationError
from payrollza.tax.base_tax import BaseTax


class SouthAfricaTax(BaseTax):
    """SARS-compliant tax calculator for South Africa.

    Loads tax brackets, rebates, UIF rates, and SDL rates from
    a JSON config file. All calculations follow SARS rules for
    the specified tax year.

    Example:
        tax_calc = SouthAfricaTax.from_config("tax_tables/za_2025.json")
        annual_paye = tax_calc.calculate_income_tax(360000, age=30)
        monthly_uif = tax_calc.calculate_uif_employee(30000)
    """

    def __init__(
        self,
        country_code: str,
        tax_year: str,
        brackets: list[dict],
        rebates: dict[str, float],
        rebate_age_thresholds: dict[str, int],
        tax_thresholds: dict[str, float],
        uif_config: dict[str, float],
        sdl_config: dict[str, float],
    ) -> None:
        super().__init__(country_code, tax_year)
        self.brackets = brackets
        self.rebates = rebates
        self.rebate_age_thresholds = rebate_age_thresholds
        self.tax_thresholds = tax_thresholds
        self.uif_config = uif_config
        self.sdl_config = sdl_config

    @classmethod
    def from_config(cls, config_path: str) -> "SouthAfricaTax":
        """Create a SouthAfricaTax instance from a JSON config file.

        Args:
            config_path: Path to the JSON tax tables file.

        Returns:
            A fully configured SouthAfricaTax calculator.

        Raises:
            FileNotFoundError: If the config file doesn't exist.
            TaxCalculationError: If the config file is malformed.
        """
        path = Path(config_path)
        if not path.exists():
            raise FileNotFoundError(
                f"Tax config not found: {config_path}"
            )

        try:
            with open(path, "r", encoding="utf-8") as file:
                config = json.load(file)
        except json.JSONDecodeError as error:
            raise TaxCalculationError(
                f"Invalid JSON in tax config: {error}"
            ) from error

        return cls(
            country_code=config["country"],
            tax_year=config["tax_year"],
            brackets=config["brackets"],
            rebates=config["rebates"],
            rebate_age_thresholds=config["rebate_age_thresholds"],
            tax_thresholds=config["tax_thresholds"],
            uif_config=config["uif"],
            sdl_config=config["sdl"],
        )

    def _get_total_rebate(self, age: int) -> float:
        """Sum up all rebates the employee qualifies for by age."""
        total = self.rebates["primary"]

        if age >= self.rebate_age_thresholds["secondary"]:
            total += self.rebates["secondary"]

        if age >= self.rebate_age_thresholds["tertiary"]:
            total += self.rebates["tertiary"]

        return total

    def _is_below_tax_threshold(
        self,
        gross_annual: float,
        age: int,
    ) -> bool:
        """Check if income is below the tax-free threshold for this age."""
        if age >= 75:
            return gross_annual <= self.tax_thresholds["age_75_plus"]
        if age >= 65:
            return gross_annual <= self.tax_thresholds["age_65_to_74"]
        return gross_annual <= self.tax_thresholds["under_65"]

    def calculate_income_tax(
        self,
        gross_annual: float,
        age: int,
    ) -> float:
        """Calculate annual PAYE using SARS progressive tax brackets.

        This is your original verified logic — same brackets, same
        cumulative base amounts — but now driven by the JSON config
        instead of hardcoded if/elif chains.

        Args:
            gross_annual: Total annual gross income in ZAR.
            age: Employee's age for rebate calculation.

        Returns:
            Annual PAYE after rebates (minimum 0).

        Raises:
            InvalidSalaryError: If gross_annual is negative.
        """
        if gross_annual < 0:
            raise InvalidSalaryError(
                f"Gross annual cannot be negative: {gross_annual}"
            )

        if gross_annual == 0:
            return 0.0

        # Short-circuit: if below tax threshold, no tax owed
        if self._is_below_tax_threshold(gross_annual, age):
            return 0.0

        # Walk through brackets to find the right one
        tax = 0.0
        for bracket in self.brackets:
            upper = bracket["upper"]

            if upper is None or gross_annual <= upper:
                # This is the bracket we land in
                tax = bracket["base_tax"] + (
                    (gross_annual - bracket["threshold"])
                    * bracket["rate"]
                )
                break

        # Subtract rebates based on age
        total_rebate = self._get_total_rebate(age)
        tax_after_rebate = tax - total_rebate

        return max(0.0, round(tax_after_rebate, 2))

    def calculate_uif_employee(self, gross_monthly: float) -> float:
        """Calculate employee UIF contribution (1% capped at ceiling).

        Args:
            gross_monthly: Monthly gross salary in ZAR.

        Returns:
            Employee's monthly UIF deduction.

        Raises:
            InvalidSalaryError: If gross_monthly is negative.
        """
        if gross_monthly < 0:
            raise InvalidSalaryError(
                f"Gross monthly cannot be negative: {gross_monthly}"
            )

        ceiling = self.uif_config["monthly_ceiling"]
        taxable = min(gross_monthly, ceiling)
        rate = self.uif_config["employee_rate"]

        return round(taxable * rate, 2)

    def calculate_uif_employer(self, gross_monthly: float) -> float:
        """Calculate employer UIF contribution (1% capped at ceiling).

        Args:
            gross_monthly: Monthly gross salary in ZAR.

        Returns:
            Employer's monthly UIF contribution.

        Raises:
            InvalidSalaryError: If gross_monthly is negative.
        """
        if gross_monthly < 0:
            raise InvalidSalaryError(
                f"Gross monthly cannot be negative: {gross_monthly}"
            )

        ceiling = self.uif_config["monthly_ceiling"]
        taxable = min(gross_monthly, ceiling)
        rate = self.uif_config["employer_rate"]

        return round(taxable * rate, 2)

    def calculate_sdl(self, gross_monthly: float) -> float:
        """Calculate Skills Development Levy (employer cost only).

        SDL is 1% of gross pay. Not deducted from the employee.
        Only applies if employer's annual payroll exceeds threshold.
        At this stage we calculate it per employee — the threshold
        check happens at the PayrollRun level in a future version.

        Args:
            gross_monthly: Monthly gross salary in ZAR.

        Returns:
            Monthly SDL amount.

        Raises:
            InvalidSalaryError: If gross_monthly is negative.
        """
        if gross_monthly < 0:
            raise InvalidSalaryError(
                f"Gross monthly cannot be negative: {gross_monthly}"
            )

        rate = self.sdl_config["rate"]
        return round(gross_monthly * rate, 2)

    def extract_age_from_id(self, id_number: str) -> int | None:
        """Extract age from a South African ID number.

        RSA ID format: YYMMDD GSSS C A Z
        First 6 digits encode date of birth as YYMMDD.
        Century logic: if YY > current 2-digit year, born in
        1900s. Otherwise born in 2000s.

        Args:
            id_number: SA ID number (13 digits).

        Returns:
            Age in years, or None if ID is invalid.
        """
        cleaned = id_number.replace(" ", "")

        if not re.match(r"^\d{13}$", cleaned):
            return None

        year_part = int(cleaned[0:2])
        month = int(cleaned[2:4])
        day = int(cleaned[4:6])

        # Basic date validation
        if month < 1 or month > 12 or day < 1 or day > 31:
            return None

        # Century: YY > current 2-digit year → 1900s
        today = date.today()
        current_yy = today.year % 100
        century = 1900 if year_part > current_yy else 2000
        birth_year = century + year_part

        # Calculate age
        age = today.year - birth_year
        if (today.month, today.day) < (month, day):
            age -= 1  # Haven't had birthday yet this year

        if age < 16 or age > 100:
            return None

        return age
