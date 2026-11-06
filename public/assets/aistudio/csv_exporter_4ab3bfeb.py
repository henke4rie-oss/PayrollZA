"""CSV export for payroll runs.

Generates a CSV file from a completed PayrollRun. Same output
format as v0.1 but built on the OOP structure. This is what
your sister downloads to check her numbers.
"""

import csv
from datetime import datetime

from payrollza.errors import ExportError
from payrollza.payroll_run import PayrollRun


def export_payroll_csv(
    payroll_run: PayrollRun,
    output_dir: str = ".",
) -> str:
    """Export a payroll run to CSV.

    Creates a CSV with one row per employee plus a totals row.
    Filename is auto-generated from company name and date.

    Args:
        payroll_run: A completed PayrollRun (must have payslips).
        output_dir: Directory to save the CSV in. Defaults to current dir.

    Returns:
        The full path to the created CSV file.

    Raises:
        ExportError: If no payslips exist or file can't be written.
    """
    if not payroll_run.payslips:
        raise ExportError(
            "Cannot export — no payslips in this run. "
            "Did you call execute() first?"
        )

    # Build filename: "ABC_Construction_2025-04-14.csv"
    safe_name = payroll_run.company_name.replace(" ", "_")
    date_stamp = datetime.now().strftime("%Y-%m-%d")
    filename = f"{safe_name}_{date_stamp}.csv"
    filepath = f"{output_dir}/{filename}"

    headers = [
        "Employee ID",
        "Name",
        "Period",
        "Age",
        "Gross",
        "Income Tax",
        "UIF (Employee)",
        "UIF (Employer)",
        "SDL",
        "Net Pay",
        "Total Employer Cost",
    ]

    try:
        with open(filepath, "w", newline="", encoding="utf-8") as file:
            writer = csv.writer(file)
            writer.writerow(headers)

            for slip in payroll_run.payslips:
                writer.writerow([
                    slip.employee_id,
                    slip.employee_name,
                    slip.period,
                    slip.age,
                    f"{slip.gross_monthly:.2f}",
                    f"{slip.paye:.2f}",
                    f"{slip.uif_employee:.2f}",
                    f"{slip.uif_employer:.2f}",
                    f"{slip.sdl:.2f}",
                    f"{slip.net_pay:.2f}",
                    f"{slip.total_employer_cost:.2f}",
                ])

            # Blank row then totals
            writer.writerow([])
            writer.writerow([
                "",
                "TOTALS",
                payroll_run.period,
                "",
                f"{payroll_run.total_gross:.2f}",
                f"{payroll_run.total_paye:.2f}",
                f"{payroll_run.total_uif_employee:.2f}",
                f"{payroll_run.total_uif_employer:.2f}",
                f"{payroll_run.total_sdl:.2f}",
                f"{payroll_run.total_net:.2f}",
                f"{payroll_run.total_employer_cost:.2f}",
            ])

    except OSError as error:
        raise ExportError(
            f"Failed to write CSV to {filepath}: {error}"
        ) from error

    return filepath
