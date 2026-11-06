"""Abstract base class for country-specific tax calculators.

WHY THIS EXISTS:
South Africa has PAYE + UIF + SDL. Thailand has PIT + SSF.
Netherlands has loonheffing + ZVW. Every country calculates
tax differently, but PayrollZA needs ONE consistent interface
to call them all.

BaseTax defines that interface. Any country module inherits
from it and fills in the actual formulas. The rest of the app
never needs to know which country it's calculating for.

WHAT ABC MEANS:
ABC = Abstract Base Class. It's a class you can NEVER create
directly (you can't do `BaseTax()`). It only exists to be
inherited. Any method marked @abstractmethod MUST be
implemented by the child class or Python throws an error
at class creation time — not at runtime when it's too late.
"""

from abc import ABC, abstractmethod


class BaseTax(ABC):
    """Contract that every country tax calculator must implement.

    Subclasses must override all @abstractmethod methods.
    If they don't, Python raises TypeError when you try to
    create an instance of the subclass.

    Attributes:
        country_code: ISO 3166-1 alpha-2 country code (e.g. "ZA").
        tax_year: The tax year this calculator covers (e.g. "2025/2026").
    """

    def __init__(self, country_code: str, tax_year: str) -> None:
        self.country_code = country_code
        self.tax_year = tax_year

    @abstractmethod
    def calculate_income_tax(
        self,
        gross_annual: float,
        age: int,
    ) -> float:
        """Calculate annual income tax after rebates.

        Args:
            gross_annual: Total annual gross income in local currency.
            age: Employee's age — determines which rebates apply.

        Returns:
            Annual income tax amount (always >= 0).
        """

    @abstractmethod
    def calculate_uif_employee(self, gross_monthly: float) -> float:
        """Calculate the employee's UIF/social security contribution.

        Args:
            gross_monthly: Monthly gross salary.

        Returns:
            Employee's monthly UIF contribution.
        """

    @abstractmethod
    def calculate_uif_employer(self, gross_monthly: float) -> float:
        """Calculate the employer's UIF/social security contribution.

        Args:
            gross_monthly: Monthly gross salary.

        Returns:
            Employer's monthly UIF contribution.
        """

    @abstractmethod
    def calculate_sdl(self, gross_monthly: float) -> float:
        """Calculate Skills Development Levy (or equivalent).

        Args:
            gross_monthly: Monthly gross salary.

        Returns:
            Monthly SDL amount (employer cost, not deducted from employee).
        """

    def extract_age_from_id(self, id_number: str) -> int | None:
        """Extract employee age from a national ID number.

        Not every country encodes birth date in their ID. This
        method returns None by default — override it in country
        modules where the ID format includes a birth date.

        Args:
            id_number: The national ID number as a string.

        Returns:
            Age in years, or None if not extractable.
        """
        return None
