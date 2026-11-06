"""JSON storage for employee data.

Simple file-based persistence. Saves employees to a JSON file
and loads them back. This gets replaced by SQLite in v0.3 and
PostgreSQL in v0.4, but the interface stays the same.

WHY JSON FIRST:
- You already know JSON from FCC
- No database setup needed
- Human-readable — open the file and see your data
- Easy to debug when something goes wrong
"""

import json
from pathlib import Path

from payrollza.employee import Employee
from payrollza.errors import StorageError


def save_employees(
    employees: list[Employee],
    file_path: str,
) -> None:
    """Save a list of employees to a JSON file.

    Args:
        employees: List of Employee objects to save.
        file_path: Path to the output JSON file.

    Raises:
        StorageError: If the file can't be written.
    """
    data = {
        "version": "0.2",
        "employees": [emp.to_dict() for emp in employees],
    }

    try:
        with open(file_path, "w", encoding="utf-8") as file:
            json.dump(data, file, indent=4, ensure_ascii=False)
    except OSError as error:
        raise StorageError(
            f"Failed to save employees to {file_path}: {error}"
        ) from error


def load_employees(file_path: str) -> list[Employee]:
    """Load employees from a JSON file.

    Args:
        file_path: Path to the JSON file.

    Returns:
        List of Employee objects.

    Raises:
        StorageError: If the file can't be read or is malformed.
        FileNotFoundError: If the file doesn't exist.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(
            f"Employee file not found: {file_path}"
        )

    try:
        with open(path, "r", encoding="utf-8") as file:
            data = json.load(file)
    except json.JSONDecodeError as error:
        raise StorageError(
            f"Invalid JSON in {file_path}: {error}"
        ) from error

    if "employees" not in data:
        raise StorageError(
            f"No 'employees' key found in {file_path}"
        )

    return [Employee.from_dict(emp) for emp in data["employees"]]
