"""PayrollZA CLI — main entry point.

This is the only file that does input/output with the user.
All business logic lives in the other modules. This makes it
easy to swap the CLI for a web UI later (v0.4) without
rewriting any calculation code.

Run with: python -m payrollza.main
"""

import re
import sys
from pathlib import Path

from payrollza.csv_exporter import export_payroll_csv
from payrollza.employee import Employee
from payrollza.errors import (
    InvalidEmployeeError,
    InvalidSalaryError,
    PayrollError,
)
from payrollza.importer import import_from_file
from payrollza.payroll_run import PayrollRun
from payrollza.storage import load_employees, save_employees
from payrollza.tax.south_africa import SouthAfricaTax


# --- Constants ---
# Path is relative to where you run the script from.
# Adjust if your project structure differs.
TAX_TABLE_PATH = Path(__file__).parent / "tax_tables" / "za_2027.json"
EMPLOYEE_FILE = "employees.json"


def parse_period(raw: str) -> str:
    """Parse a pay period string into MM/YYYY format.

    Accepts these SA-friendly formats:
        04/25, 04-25, 04 25       → 04/2025
        04/2025, 04-2025, 04 2025 → 04/2025

    Args:
        raw: User input string.

    Returns:
        Period in MM/YYYY format, or empty string if invalid.
    """
    cleaned = raw.strip()

    # Try to split on / or - or space
    match = re.match(r"^(\d{1,2})[/\- ](\d{2,4})$", cleaned)
    if not match:
        return ""

    month_str = match.group(1)
    year_str = match.group(2)

    # Validate month
    month = int(month_str)
    if month < 1 or month > 12:
        return ""

    # Convert 2-digit year to 4-digit (25 → 2025)
    if len(year_str) == 2:
        year = 2000 + int(year_str)
    elif len(year_str) == 4:
        year = int(year_str)
    else:
        return ""

    return f"{month:02d}/{year}"


def generate_employee_id(company_name: str, number: int) -> str:
    """Auto-generate an employee ID from company name + number.

    Takes the first 3 letters of the company name (uppercase),
    strips non-alpha characters, and appends a zero-padded number.

    Examples:
        ("ABC Construction", 1) → "ABC001"
        ("Van Wyk Farms", 3)    → "VAN003"
        ("Jo's Place", 12)      → "JOS012"

    Args:
        company_name: The company name to extract prefix from.
        number: Employee number to append.

    Returns:
        Employee ID string like "ABC001".
    """
    # Keep only letters, take first 3, uppercase
    letters_only = "".join(c for c in company_name if c.isalpha())
    prefix = letters_only[:3].upper()

    # Fallback if company name has fewer than 3 letters
    if len(prefix) < 3:
        prefix = prefix.ljust(3, "X")

    return f"{prefix}{number:03d}"


def get_tax_calculator() -> SouthAfricaTax:
    """Load the SA tax calculator from JSON config."""
    return SouthAfricaTax.from_config(str(TAX_TABLE_PATH))


def get_valid_input(
    prompt: str,
    input_type: type,
    min_value: float | None = None,
    max_value: float | None = None,
) -> float | int | str:
    """Keep asking until the user gives valid input.

    This replaces raw input() calls that crash on bad data.
    Loops until it gets a value of the right type and range.

    Args:
        prompt: What to show the user.
        input_type: Expected type (int, float, or str).
        min_value: Minimum allowed value (for numbers).
        max_value: Maximum allowed value (for numbers).

    Returns:
        The validated input value.
    """
    while True:
        raw = input(prompt).strip()
        if not raw:
            print("  Input cannot be empty. Try again.")
            continue

        try:
            value = input_type(raw)
        except ValueError:
            print(f"  Expected a {input_type.__name__}. Try again.")
            continue

        if min_value is not None and value < min_value:
            print(f"  Must be at least {min_value}. Try again.")
            continue

        if max_value is not None and value > max_value:
            print(f"  Must be at most {max_value}. Try again.")
            continue

        return value


def input_employee(
    employee_number: int,
    company_name: str,
) -> Employee:
    """Collect one employee's details from the terminal.

    Args:
        employee_number: Display number (1, 2, 3...).
        company_name: Used for auto-generating employee ID.

    Returns:
        A validated Employee object.
    """
    print(f"\n--- Employee {employee_number} ---")

    name = input("  Name: ").strip()
    while not name:
        print("  Name cannot be empty.")
        name = input("  Name: ").strip()

    employee_id = input(
        "  Employee ID (press Enter to auto-generate): "
    ).strip()
    if not employee_id:
        employee_id = generate_employee_id(
            company_name, employee_number
        )
        print(f"  → Auto-assigned: {employee_id}")

    gross = get_valid_input(
        "  Monthly gross salary (R): ",
        float,
        min_value=0,
    )
    age = get_valid_input(
        "  Age: ",
        int,
        min_value=16,
        max_value=100,
    )

    return Employee(
        name=name,
        employee_id=employee_id,
        gross_monthly_salary=gross,
        age=age,
    )


def collect_employees(company_name: str) -> list[Employee]:
    """Ask the user how many employees and collect each one."""
    num = get_valid_input(
        "How many employees? ",
        int,
        min_value=1,
        max_value=1000,
    )

    employees = []
    for i in range(num):
        employee = input_employee(i + 1, company_name)
        employees.append(employee)

    return employees


def get_employees(company_name: str) -> list[Employee]:
    """Let the user choose how to load employees.

    Options:
        1. Load from saved JSON (if file exists)
        2. Import from Excel or CSV
        3. Enter manually

    Args:
        company_name: Passed to importer and manual entry for ID gen.

    Returns:
        List of Employee objects.
    """
    has_saved = Path(EMPLOYEE_FILE).exists()

    print("\n  How do you want to load employees?")
    if has_saved:
        print("    1. Load saved employees")
    print("    2. Import from Excel/CSV file")
    print("    3. Enter manually")

    valid_choices = ["2", "3"]
    if has_saved:
        valid_choices.append("1")

    choice = ""
    while choice not in valid_choices:
        choice = input("  Choose (enter number): ").strip()

    # Option 1: Load saved
    if choice == "1" and has_saved:
        employees = load_employees(EMPLOYEE_FILE)
        print(f"  Loaded {len(employees)} employees.")
        for emp in employees:
            print(f"    {emp}")
        return employees

    # Option 2: Import from file
    if choice == "2":
        file_path = input(
            "  File path (.xlsx or .csv): "
        ).strip()
        while not file_path:
            file_path = input("  File path: ").strip()

        try:
            return import_from_file(file_path, company_name)
        except (FileNotFoundError, PayrollError) as error:
            print(f"\n  Import failed: {error}")
            print("  Falling back to manual entry.\n")
            return collect_employees(company_name)

    # Option 3: Manual entry
    return collect_employees(company_name)


def print_payroll_summary(run: PayrollRun) -> None:
    """Print a formatted payroll summary to the terminal."""
    print(f"\n{'=' * 60}")
    print(f"  PAYROLL SUMMARY — {run.company_name}")
    print(f"  Period: {run.period}")
    print(f"{'=' * 60}")

    for slip in run.payslips:
        print(f"  {slip}")

    print(f"\n{'-' * 60}")
    print(f"  Total Gross:         R{run.total_gross:>12,.2f}")
    print(f"  Total Income Tax:    R{run.total_paye:>12,.2f}")
    print(f"  Total UIF (Employee):R{run.total_uif_employee:>12,.2f}")
    print(f"  Total UIF (Employer):R{run.total_uif_employer:>12,.2f}")
    print(f"  Total SDL:           R{run.total_sdl:>12,.2f}")
    print(f"  Total Net Pay:       R{run.total_net:>12,.2f}")
    print(f"  Total Employer Cost: R{run.total_employer_cost:>12,.2f}")
    print(f"{'-' * 60}")


def main() -> None:
    """Main CLI workflow.

    1. Load or input employees
    2. Run payroll calculations
    3. Display summary
    4. Export CSV
    5. Save employees for next time
    """
    print("\n=== PayrollZA v0.2 ===\n")

    # Step 1: Get the tax calculator
    try:
        tax_calc = get_tax_calculator()
        print(f"Tax tables loaded: {tax_calc.tax_year}")
    except FileNotFoundError as error:
        print(f"ERROR: {error}")
        sys.exit(1)

    # Step 2: Get company name (needed for auto-generating employee IDs)
    company = input("\nCompany name: ").strip()
    while not company:
        print("  Company name cannot be empty.")
        company = input("Company name: ").strip()

    # Step 3: Load, import, or enter employees
    employees = get_employees(company)

    # Step 4: Get pay period (SA format: MM/YY or MM/YYYY)
    period = ""
    while not period:
        raw = input(
            "Pay period (e.g. 04/25 or 04/2025): "
        ).strip()
        period = parse_period(raw)
        if not period:
            print(
                "  Invalid format. Use MM/YY or MM/YYYY "
                "(e.g. 04/25, 04-2025, 04 25)"
            )

    # Step 5: Execute payroll
    try:
        run = PayrollRun(company, period, tax_calc)
        run.execute(employees)
    except PayrollError as error:
        print(f"\nPayroll error: {error}")
        sys.exit(1)

    # Step 5: Display results
    print_payroll_summary(run)

    # Step 6: Export CSV
    try:
        csv_path = export_payroll_csv(run)
        print(f"\n  CSV saved to: {csv_path}")
    except PayrollError as error:
        print(f"\n  CSV export failed: {error}")

    # Step 7: Save employees for next run
    save_choice = input(
        "\nSave employees for next time? (y/n): "
    ).strip().lower()
    if save_choice == "y":
        try:
            save_employees(employees, EMPLOYEE_FILE)
            print(f"  Employees saved to {EMPLOYEE_FILE}")
        except PayrollError as error:
            print(f"  Save failed: {error}")

    print("\nDone!")


if __name__ == "__main__":
    main()
