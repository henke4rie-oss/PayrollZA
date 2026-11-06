"""Employee model for PayrollZA.

An Employee is the core entity — everything revolves around
calculating what they earn, what gets deducted, and what
they take home. This class handles identity and salary data.
The actual tax math lives in the tax module.
"""

from payrollza.errors import InvalidEmployeeError, InvalidSalaryError


class Employee:
    """Represents a single employee on the payroll.

    Attributes:
        name: Full name as it appears on payslips.
        employee_id: Unique identifier (you assign this).
        gross_monthly_salary: Monthly salary before deductions.
        age: Age in years — determines tax rebates.
        is_active: Whether this employee is currently on payroll.

    Example:
        emp = Employee(
            name="Thabo Molefe",
            employee_id="EMP001",
            gross_monthly_salary=35000.00,
            age=34,
        )
        print(emp)  # Employee(EMP001: Thabo Molefe — R35,000.00/month)
    """

    def __init__(
        self,
        name: str,
        employee_id: str,
        gross_monthly_salary: float,
        age: int,
        is_active: bool = True,
    ) -> None:
        # Validate before assigning — fail fast, fail loud
        self._validate_name(name)
        self._validate_employee_id(employee_id)
        self._validate_salary(gross_monthly_salary)
        self._validate_age(age)

        self.name = name.strip()
        self.employee_id = employee_id.strip()
        self.gross_monthly_salary = gross_monthly_salary
        self.age = age
        self.is_active = is_active

    @property
    def gross_annual_salary(self) -> float:
        """Annual salary = monthly * 12. Read-only."""
        return self.gross_monthly_salary * 12

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON storage.

        Returns:
            Dictionary with all employee fields.
        """
        return {
            "name": self.name,
            "employee_id": self.employee_id,
            "gross_monthly_salary": self.gross_monthly_salary,
            "age": self.age,
            "is_active": self.is_active,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Employee":
        """Create an Employee from a dictionary (loaded from JSON).

        Args:
            data: Dictionary with employee fields.

        Returns:
            A new Employee instance.

        Raises:
            InvalidEmployeeError: If required fields are missing.
        """
        required_fields = [
            "name",
            "employee_id",
            "gross_monthly_salary",
            "age",
        ]
        missing = [f for f in required_fields if f not in data]
        if missing:
            raise InvalidEmployeeError(
                f"Missing required fields: {', '.join(missing)}"
            )

        return cls(
            name=data["name"],
            employee_id=data["employee_id"],
            gross_monthly_salary=data["gross_monthly_salary"],
            age=data["age"],
            is_active=data.get("is_active", True),
        )

    def __str__(self) -> str:
        """Human-readable: for print() and payslips."""
        salary_formatted = f"R{self.gross_monthly_salary:,.2f}"
        status = "Active" if self.is_active else "Inactive"
        return (
            f"Employee({self.employee_id}: {self.name} "
            f"— {salary_formatted}/month, {status})"
        )

    def __repr__(self) -> str:
        """Developer-readable: for debugging."""
        return (
            f"Employee(name={self.name!r}, "
            f"employee_id={self.employee_id!r}, "
            f"gross_monthly_salary={self.gross_monthly_salary}, "
            f"age={self.age}, is_active={self.is_active})"
        )

    # --- Validation methods (private) ---

    @staticmethod
    def _validate_name(name: str) -> None:
        """Name must be a non-empty string."""
        if not isinstance(name, str) or not name.strip():
            raise InvalidEmployeeError(
                "Employee name must be a non-empty string."
            )

    @staticmethod
    def _validate_employee_id(employee_id: str) -> None:
        """Employee ID must be a non-empty string."""
        if not isinstance(employee_id, str) or not employee_id.strip():
            raise InvalidEmployeeError(
                "Employee ID must be a non-empty string."
            )

    @staticmethod
    def _validate_salary(salary: float) -> None:
        """Salary must be a positive number."""
        if not isinstance(salary, (int, float)):
            raise InvalidSalaryError(
                f"Salary must be a number, received "
                f"{type(salary).__name__}."
            )
        if salary < 0:
            raise InvalidSalaryError(
                f"Salary cannot be negative. Value entered: {salary}"
            )

    @staticmethod
    def _validate_age(age: int) -> None:
        """Age must be between 16 and 100 (BCEA minimum working age)."""
        if not isinstance(age, int):
            raise InvalidEmployeeError(
                f"Age must be a whole number, received "
                f"{type(age).__name__}."
            )
        if age < 16 or age > 100:
            raise InvalidEmployeeError(
                f"Age must be between 16 and 100. "
                f"Value entered: {age}."
            )
