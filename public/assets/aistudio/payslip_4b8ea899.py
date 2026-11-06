"""Payslip model for PayrollZA.

A Payslip is the OUTPUT of a payroll calculation. It holds
the breakdown of one employee's pay for one period. It's
read-only by design — once generated, it shouldn't change.
If something was wrong, you re-run the calculation.
"""


class Payslip:
    """One employee's payroll result for a single period.

    This is a data container — all the calculation happens in
    PayrollRun. The Payslip just holds the results cleanly.

    Attributes:
        employee_name: Name for display on the payslip.
        employee_id: Links back to the Employee record.
        period: Pay period string (e.g. "2025-04").
        gross_monthly: Gross salary for this period.
        paye: Income tax deducted (called PAYE in SA, PIT in TH, etc.).
        uif_employee: Employee's UIF contribution.
        uif_employer: Employer's UIF contribution.
        sdl: Skills Development Levy (employer cost).
        net_pay: What the employee takes home.
    """

    def __init__(
        self,
        employee_name: str,
        employee_id: str,
        period: str,
        gross_monthly: float,
        age: int,
        paye: float,
        uif_employee: float,
        uif_employer: float,
        sdl: float,
    ) -> None:
        self.employee_name = employee_name
        self.employee_id = employee_id
        self.period = period
        self.gross_monthly = gross_monthly
        self.age = age
        self.paye = paye
        self.uif_employee = uif_employee
        self.uif_employer = uif_employer
        self.sdl = sdl

    @property
    def net_pay(self) -> float:
        """Take-home pay = gross - PAYE - employee UIF.

        SDL is NOT deducted from the employee — it's an
        employer cost. So it doesn't reduce net pay.
        """
        return round(
            self.gross_monthly - self.paye - self.uif_employee, 2
        )

    @property
    def total_employer_cost(self) -> float:
        """Total cost to employer = gross + employer UIF + SDL."""
        return round(
            self.gross_monthly + self.uif_employer + self.sdl, 2
        )

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON/CSV export."""
        return {
            "employee_name": self.employee_name,
            "employee_id": self.employee_id,
            "period": self.period,
            "age": self.age,
            "gross_monthly": self.gross_monthly,
            "paye": self.paye,
            "uif_employee": self.uif_employee,
            "uif_employer": self.uif_employer,
            "sdl": self.sdl,
            "net_pay": self.net_pay,
            "total_employer_cost": self.total_employer_cost,
        }

    def __str__(self) -> str:
        """Formatted payslip line for terminal output."""
        return (
            f"{self.employee_name} ({self.employee_id}) | "
            f"Gross: R{self.gross_monthly:,.2f} | "
            f"Tax: R{self.paye:,.2f} | "
            f"UIF: R{self.uif_employee:,.2f} | "
            f"Net: R{self.net_pay:,.2f}"
        )
