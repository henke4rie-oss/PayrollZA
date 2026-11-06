"""PayrollRun model for PayrollZA.

A PayrollRun is one batch calculation — you give it a list of
employees and a tax calculator, and it produces a Payslip for
each active employee. This is the core workflow of the app.
"""

from payrollza.employee import Employee
from payrollza.errors import PayrollError
from payrollza.payslip import Payslip
from payrollza.tax.base_tax import BaseTax


class PayrollRun:
    """Execute payroll calculations for a group of employees.

    Takes a list of employees and a tax calculator, then generates
    one Payslip per active employee. Inactive employees are skipped.

    Attributes:
        company_name: Name shown on payslips and CSV export.
        period: Pay period string (e.g. "2025-04").
        tax_calculator: Any BaseTax subclass (SA, TH, NL, etc.).
        payslips: Generated after calling run(). Empty until then.

    Example:
        tax = SouthAfricaTax.from_config("tax_tables/za_2025.json")
        run = PayrollRun("ABC Construction", "2025-04", tax)
        run.execute(employees)
        for slip in run.payslips:
            print(slip)
    """

    def __init__(
        self,
        company_name: str,
        period: str,
        tax_calculator: BaseTax,
    ) -> None:
        if not company_name.strip():
            raise PayrollError("Company name cannot be empty.")
        if not period.strip():
            raise PayrollError("Period cannot be empty.")

        self.company_name = company_name.strip()
        self.period = period.strip()
        self.tax_calculator = tax_calculator
        self.payslips: list[Payslip] = []

    def execute(self, employees: list[Employee]) -> list[Payslip]:
        """Run payroll for all active employees.

        Calculates income tax, social contributions, and levies
        for each active employee and stores the results as
        Payslip objects.

        Args:
            employees: List of Employee objects to process.

        Returns:
            List of generated Payslips.

        Raises:
            PayrollError: If no active employees are found.
        """
        active = [emp for emp in employees if emp.is_active]

        if not active:
            raise PayrollError("No active employees to process.")

        self.payslips = []
        for employee in active:
            payslip = self._calculate_single(employee)
            self.payslips.append(payslip)

        return self.payslips

    def _calculate_single(self, employee: Employee) -> Payslip:
        """Calculate payroll for one employee."""
        calc = self.tax_calculator
        gross = employee.gross_monthly_salary

        # Annual income tax divided by 12 for monthly deduction
        annual_paye = calc.calculate_income_tax(
            employee.gross_annual_salary, employee.age
        )
        monthly_paye = round(annual_paye / 12, 2)

        uif_employee = calc.calculate_uif_employee(gross)
        uif_employer = calc.calculate_uif_employer(gross)
        sdl = calc.calculate_sdl(gross)

        return Payslip(
            employee_name=employee.name,
            employee_id=employee.employee_id,
            period=self.period,
            gross_monthly=gross,
            age=employee.age,
            paye=monthly_paye,
            uif_employee=uif_employee,
            uif_employer=uif_employer,
            sdl=sdl,
        )

    @property
    def total_gross(self) -> float:
        """Sum of all gross salaries in this run."""
        return round(sum(s.gross_monthly for s in self.payslips), 2)

    @property
    def total_paye(self) -> float:
        """Sum of all PAYE deductions in this run."""
        return round(sum(s.paye for s in self.payslips), 2)

    @property
    def total_uif_employee(self) -> float:
        """Sum of all employee UIF contributions."""
        return round(sum(s.uif_employee for s in self.payslips), 2)

    @property
    def total_uif_employer(self) -> float:
        """Sum of all employer UIF contributions."""
        return round(sum(s.uif_employer for s in self.payslips), 2)

    @property
    def total_sdl(self) -> float:
        """Sum of all SDL amounts."""
        return round(sum(s.sdl for s in self.payslips), 2)

    @property
    def total_net(self) -> float:
        """Sum of all net pay amounts."""
        return round(sum(s.net_pay for s in self.payslips), 2)

    @property
    def total_employer_cost(self) -> float:
        """Sum of total cost to employer for all employees."""
        return round(
            sum(s.total_employer_cost for s in self.payslips), 2
        )

    def __str__(self) -> str:
        """Summary of the payroll run."""
        count = len(self.payslips)
        return (
            f"PayrollRun({self.company_name} — {self.period}: "
            f"{count} employees, "
            f"Total Gross: R{self.total_gross:,.2f}, "
            f"Total Net: R{self.total_net:,.2f})"
        )
