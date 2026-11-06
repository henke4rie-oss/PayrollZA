"""Excel and CSV importer for PayrollZA.

Reads employee data from a spreadsheet and auto-detects which
column is which based on the actual data — not the headers.
This matters because farmer clients and small businesses have
messy spreadsheets with inconsistent or missing headers.

Detection logic:
    - Text values (can't be a number)     → Name or Surname
    - Exactly 13 digits                   → RSA ID number
    - Mix of letters and digits            → Work/Employee ID
    - Number under 100                     → Age
    - Number 100+ (not 13 digits)          → Salary

If anything is ambiguous, the user confirms before proceeding.
"""

import csv
import re
from pathlib import Path

from payrollza.employee import Employee
from payrollza.errors import InvalidEmployeeError, StorageError


# --- Column type constants ---
NAME = "name"
SURNAME = "surname"
RSA_ID = "rsa_id"
EMPLOYEE_ID = "employee_id"
AGE = "age"
SALARY = "salary"
UNKNOWN = "unknown"

# All types the user can assign during reassignment
ASSIGNABLE_TYPES = [NAME, SURNAME, EMPLOYEE_ID, AGE, SALARY]


def read_file(file_path: str) -> list[list[str]]:
    """Read all rows from an Excel or CSV file.

    Args:
        file_path: Path to .xlsx, .xls, or .csv file.

    Returns:
        List of rows, where each row is a list of string values.

    Raises:
        StorageError: If the file type is unsupported or unreadable.
    """
    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    suffix = path.suffix.lower()

    if suffix in (".xlsx", ".xls"):
        return _read_excel(file_path)
    elif suffix == ".csv":
        return _read_csv(file_path)
    else:
        raise StorageError(
            f"Unsupported file type: {suffix}. "
            "Use .xlsx, .xls, or .csv"
        )


def _read_excel(file_path: str) -> list[list[str]]:
    """Read rows from an Excel file using openpyxl."""
    try:
        import openpyxl
    except ImportError:
        raise StorageError(
            "openpyxl is required to read Excel files. "
            "Install it with: pip install openpyxl"
        )

    try:
        workbook = openpyxl.load_workbook(file_path, read_only=True)
        sheet = workbook.active
        rows = []
        for row in sheet.iter_rows(values_only=True):
            # Convert all cell values to strings, skip fully empty rows
            string_row = [str(cell).strip() if cell is not None else "" for cell in row]
            if any(string_row):
                rows.append(string_row)
        workbook.close()
        return rows
    except Exception as error:
        raise StorageError(f"Failed to read Excel file: {error}") from error


def _read_csv(file_path: str) -> list[list[str]]:
    """Read rows from a CSV file."""
    try:
        with open(file_path, "r", encoding="utf-8") as file:
            reader = csv.reader(file)
            rows = []
            for row in reader:
                string_row = [cell.strip() for cell in row]
                if any(string_row):
                    rows.append(string_row)
            return rows
    except Exception as error:
        raise StorageError(f"Failed to read CSV file: {error}") from error


def detect_header_row(rows: list[list[str]]) -> bool:
    """Check if the first row looks like headers.

    Headers typically contain words like "name", "salary", "age",
    "id", etc. Data rows typically contain actual values.

    Args:
        rows: All rows from the file.

    Returns:
        True if the first row appears to be headers.
    """
    if not rows:
        return False

    header_keywords = {
        "name", "surname", "first", "last", "employee",
        "salary", "wage", "pay", "gross", "income",
        "age", "id", "number", "no", "nr",
    }

    first_row = rows[0]
    matches = 0
    for cell in first_row:
        # Check if any header keyword appears in this cell
        cell_lower = cell.lower()
        for keyword in header_keywords:
            if keyword in cell_lower:
                matches += 1
                break

    # If more than half the columns match header keywords, it's a header
    return matches >= len(first_row) / 2


def classify_value(value: str) -> str:
    """Classify a single cell value into a likely column type.

    Args:
        value: The cell value as a string.

    Returns:
        One of: NAME, RSA_ID, EMPLOYEE_ID, AGE, SALARY, UNKNOWN.
    """
    if not value:
        return UNKNOWN

    # Remove spaces, commas, and currency prefix before analysis
    cleaned = value.replace(" ", "").replace(",", "")

    # Check for RSA ID: exactly 13 digits
    if re.match(r"^\d{13}$", cleaned):
        return RSA_ID

    # Strip currency prefix (R, Rand, ZAR) before number check
    num_str = re.sub(r"^[Rr](?:and)?|^ZAR", "", cleaned, flags=re.IGNORECASE)

    # Check if it's a pure number (int or float)
    try:
        number = float(num_str)

        # Age: whole number under 100
        if number == int(number) and 0 < number < 100:
            return AGE

        # Salary: number 100 or above
        if number >= 100:
            return SALARY

        return UNKNOWN

    except ValueError:
        pass

    # Check for work/employee ID: mix of letters and digits
    has_letters = any(c.isalpha() for c in value)
    has_digits = any(c.isdigit() for c in value)
    if has_letters and has_digits:
        return EMPLOYEE_ID

    # Pure text → name
    if has_letters:
        return NAME

    return UNKNOWN


def detect_columns(
    data_rows: list[list[str]],
) -> list[dict[str, str | list[str]]]:
    """Analyze each column across all rows and assign a type.

    Looks at every value in each column, classifies them, and
    picks the most common classification as the column type.

    Args:
        data_rows: Rows of data (headers already removed if present).

    Returns:
        List of dicts, one per column:
        {"index": int, "type": str, "sample": list[str]}
    """
    if not data_rows:
        return []

    num_columns = max(len(row) for row in data_rows)
    columns = []

    for col_index in range(num_columns):
        # Collect all values in this column
        values = []
        for row in data_rows:
            if col_index < len(row) and row[col_index]:
                values.append(row[col_index])

        if not values:
            columns.append({
                "index": col_index,
                "type": UNKNOWN,
                "sample": [],
            })
            continue

        # Classify each value and count the types
        type_counts: dict[str, int] = {}
        for value in values:
            value_type = classify_value(value)
            type_counts[value_type] = type_counts.get(value_type, 0) + 1

        # Remove UNKNOWN from consideration if other types exist
        known_types = {
            t: c for t, c in type_counts.items() if t != UNKNOWN
        }
        if known_types:
            best_type = max(known_types, key=known_types.get)
        else:
            best_type = UNKNOWN

        # Sample: first 3 non-empty values for display
        sample = values[:3]

        columns.append({
            "index": col_index,
            "type": best_type,
            "sample": sample,
        })

    # Handle multiple NAME columns → second one becomes SURNAME
    name_columns = [c for c in columns if c["type"] == NAME]
    if len(name_columns) >= 2:
        name_columns[1]["type"] = SURNAME

    return columns


def print_detection_results(
    columns: list[dict],
    headers: list[str] | None,
) -> None:
    """Show the user what was detected for each column.

    Args:
        columns: Output from detect_columns().
        headers: Original header row if one was found, else None.
    """
    print("\n  Detected columns:")
    for i, col in enumerate(columns):
        header_label = ""
        if headers and i < len(headers):
            header_label = f' (header: "{headers[i]}")'

        sample_str = ", ".join(col["sample"])
        print(
            f"    Column {i + 1}{header_label}: "
            f"{col['type'].upper()} → [{sample_str}]"
        )


def confirm_or_reassign(
    columns: list[dict],
    headers: list[str] | None,
) -> list[dict]:
    """Let the user confirm or change column assignments.

    Shows detected columns and asks user to accept or reassign.

    Args:
        columns: Output from detect_columns().
        headers: Original header row if found, else None.

    Returns:
        Updated columns list with final type assignments.
    """
    print_detection_results(columns, headers)

    choice = input(
        "\n  Accept these assignments? (y/n): "
    ).strip().lower()

    if choice == "y":
        return columns

    # Reassignment mode
    print("\n  Reassign columns. Options: "
          "name, surname, employee_id, age, salary, skip")

    for i, col in enumerate(columns):
        sample_str = ", ".join(col["sample"])
        new_type = input(
            f"    Column {i + 1} [{sample_str}] "
            f"(currently {col['type']}): "
        ).strip().lower()

        if new_type == "skip":
            col["type"] = UNKNOWN
        elif new_type in ASSIGNABLE_TYPES:
            col["type"] = new_type
        elif new_type == "":
            pass  # Keep current assignment
        else:
            print(f"    Unknown type '{new_type}', keeping {col['type']}")

    return columns


def build_employees(
    data_rows: list[list[str]],
    columns: list[dict],
    company_name: str,
) -> list[Employee]:
    """Convert spreadsheet rows into Employee objects.

    Uses the column assignments to extract the right values
    from each row. Auto-generates employee IDs if none was
    detected or if the column was skipped.

    Args:
        data_rows: The actual data (no headers).
        columns: Column assignments from detect/confirm step.
        company_name: For auto-generating employee IDs.

    Returns:
        List of valid Employee objects. Skips bad rows with a warning.
    """
    # Build a lookup: type → column index
    type_to_index: dict[str, int] = {}
    for col in columns:
        if col["type"] != UNKNOWN:
            type_to_index[col["type"]] = col["index"]

    has_name = NAME in type_to_index
    has_salary = SALARY in type_to_index
    has_age = AGE in type_to_index

    if not has_name:
        raise InvalidEmployeeError(
            "No name column detected. Cannot import."
        )
    if not has_salary:
        raise InvalidEmployeeError(
            "No salary column detected. Cannot import."
        )
    if not has_age:
        raise InvalidEmployeeError(
            "No age column detected. Cannot import."
        )

    employees = []
    skipped = 0

    for row_num, row in enumerate(data_rows, start=1):
        try:
            # Extract name
            name = _get_cell(row, type_to_index[NAME])
            if SURNAME in type_to_index:
                surname = _get_cell(row, type_to_index[SURNAME])
                if surname:
                    name = f"{name} {surname}"

            # Extract salary
            salary_raw = _get_cell(row, type_to_index[SALARY])
            salary = _parse_number(salary_raw)

            # Extract age
            age_raw = _get_cell(row, type_to_index[AGE])
            age = int(_parse_number(age_raw))

            # Extract employee ID (optional)
            employee_id = ""
            if EMPLOYEE_ID in type_to_index:
                employee_id = _get_cell(
                    row, type_to_index[EMPLOYEE_ID]
                )
            if not employee_id:
                # Auto-generate from company name
                letters = "".join(
                    c for c in company_name if c.isalpha()
                )
                prefix = letters[:3].upper().ljust(3, "X")
                employee_id = f"{prefix}{row_num:03d}"

            employee = Employee(
                name=name,
                employee_id=employee_id,
                gross_monthly_salary=salary,
                age=age,
            )
            employees.append(employee)

        except (ValueError, InvalidEmployeeError) as error:
            print(f"  Row {row_num} skipped: {error}")
            skipped += 1

    if skipped > 0:
        print(f"\n  {skipped} row(s) skipped due to errors.")

    return employees


def _get_cell(row: list[str], index: int) -> str:
    """Safely get a cell value from a row."""
    if index < len(row):
        return row[index]
    return ""


def _parse_number(value: str) -> float:
    """Parse a number from a string, handling commas and spaces."""
    cleaned = value.replace(" ", "").replace(",", "").replace("R", "")
    return float(cleaned)


def import_from_file(
    file_path: str,
    company_name: str,
) -> list[Employee]:
    """Full import pipeline: read → detect → confirm → build.

    This is the main function to call from main.py.

    Args:
        file_path: Path to .xlsx, .xls, or .csv file.
        company_name: For auto-generating employee IDs.

    Returns:
        List of Employee objects ready for payroll.
    """
    print(f"\n  Reading: {file_path}")
    rows = read_file(file_path)

    if not rows:
        raise StorageError("File is empty — no data found.")

    print(f"  Found {len(rows)} rows.")

    # Check for headers
    has_headers = detect_header_row(rows)
    headers = None
    data_rows = rows

    if has_headers:
        headers = rows[0]
        data_rows = rows[1:]
        print(f"  Header row detected, {len(data_rows)} data rows.")

    # Detect column types
    columns = detect_columns(data_rows)

    # Let user confirm or reassign
    columns = confirm_or_reassign(columns, headers)

    # Build employees
    employees = build_employees(data_rows, columns, company_name)

    print(f"\n  Successfully imported {len(employees)} employees:")
    for emp in employees:
        print(f"    {emp}")

    return employees
