"""Custom exceptions for PayrollZA.

Every error type maps to a specific failure mode so callers can
catch exactly what went wrong instead of guessing from a generic
Exception message.
"""


class PayrollError(Exception):
    """Base exception for all PayrollZA errors.

    All custom exceptions inherit from this so you can catch
    PayrollError to handle any payroll-related failure, or catch
    a specific subclass for fine-grained control.
    """


class InvalidSalaryError(PayrollError):
    """Raised when a salary value is negative or unreasonable."""


class InvalidEmployeeError(PayrollError):
    """Raised when employee data fails validation."""


class TaxCalculationError(PayrollError):
    """Raised when a tax calculation produces an impossible result."""


class StorageError(PayrollError):
    """Raised when saving or loading data fails."""


class ExportError(PayrollError):
    """Raised when CSV or report export fails."""
