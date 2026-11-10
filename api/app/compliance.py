"""SARS compliance deadlines (EMP201, EMP501) and the iCalendar feed."""

import calendar
import json
from datetime import date, timedelta
from pathlib import Path
from typing import Any

import holidays

# TODO(verify): confirm with SARS - nominal EMP501 deadlines (SARS may announce season-specific dates)
EMP501_INTERIM_DUE_MONTH = 10
EMP501_INTERIM_DUE_DAY = 31
EMP501_ANNUAL_DUE_MONTH = 5
EMP501_ANNUAL_DUE_DAY = 31

DEFAULT_OVERRIDES_PATH = Path(__file__).resolve().parent / "tax_tables" / "holiday_overrides.json"
ICS_DTSTAMP = "20260101T000000Z"
MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


def _parse_iso_date(value: Any, label: str) -> date:
    try:
        return date.fromisoformat(str(value))
    except ValueError as err:
        raise ValueError(
            f"Invalid date {value!r} in holiday overrides ({label}); expected YYYY-MM-DD"
        ) from err


def load_holiday_overrides(overrides_path: Path | None = None) -> tuple[set[date], set[date]]:
    """Return (added, removed) ad-hoc holidays. A missing file means no overrides.

    A malformed file or date raises ValueError: wrong holiday data must never be ignored silently.
    """
    path = overrides_path or DEFAULT_OVERRIDES_PATH
    if not path.exists():
        return set(), set()
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as err:
        raise ValueError(f"Holiday overrides file {path} is not valid JSON: {err}") from err
    if not isinstance(data, dict):
        raise TypeError(f"Holiday overrides file {path} must contain a JSON object")
    added = {_parse_iso_date(item, "added") for item in data.get("added", {})}
    removed = {_parse_iso_date(item, "removed") for item in data.get("removed", [])}
    return added, removed


def get_sa_holidays(years: list[int], overrides_path: Path | None = None) -> set[date]:
    """All effective SA public holidays for the given years (library data + overrides)."""
    base = set(holidays.country_holidays("ZA", years=years).keys())
    added, removed = load_holiday_overrides(overrides_path)
    return (base | added) - removed


def is_sa_business_day(d: date, overrides_path: Path | None = None) -> bool:
    if d.weekday() >= 5:  # Saturday or Sunday
        return False
    return d not in get_sa_holidays([d.year], overrides_path)


def adjust_to_last_business_day(target: date, overrides_path: Path | None = None) -> date:
    """If target is a weekend or public holiday, return the last business day before it."""
    current = target
    while not is_sa_business_day(current, overrides_path):
        current -= timedelta(days=1)
    return current


def emp201_due_date(year: int, month: int, overrides_path: Path | None = None) -> date:
    """Due date of the EMP201 for the given payroll month: the 7th of the next month,
    moved back to the last business day if that is a weekend or public holiday."""
    if month < 1 or month > 12:
        raise ValueError(f"Month must be between 1 and 12, got: {month}")
    next_year, next_month = (year + 1, 1) if month == 12 else (year, month + 1)
    return adjust_to_last_business_day(date(next_year, next_month, 7), overrides_path)


def emp501_periods(tax_year: str, overrides_path: Path | None = None) -> dict[str, dict[str, Any]]:
    """EMP501 interim (Mar-Aug) and annual (Mar-Feb) periods with weekend/holiday-adjusted due dates."""
    cleaned = str(tax_year).strip()
    if "/" in cleaned:
        parts = cleaned.split("/")
    elif "-" in cleaned:
        parts = cleaned.split("-")
    elif cleaned.isdigit():
        parts = [cleaned, str(int(cleaned) + 1)]
    else:
        raise ValueError(f"Invalid tax year format: {tax_year}. Expected YYYY/YYYY (e.g., 2026/2027).")
    try:
        start_year, end_year = int(parts[0]), int(parts[1])
    except (IndexError, ValueError) as err:
        raise ValueError(f"Invalid tax year format: {tax_year}") from err
    if end_year != start_year + 1 and len(str(end_year)) == 2:
        end_year = (start_year // 100) * 100 + end_year

    interim_nominal = date(start_year, EMP501_INTERIM_DUE_MONTH, EMP501_INTERIM_DUE_DAY)
    annual_nominal = date(end_year, EMP501_ANNUAL_DUE_MONTH, EMP501_ANNUAL_DUE_DAY)
    label = f"{start_year}/{end_year}"
    return {
        "interim": {
            "period_type": "interim",
            "period_name": f"Interim Reconciliation ({start_year}/03 - {start_year}/08)",
            "tax_year": label,
            "period_start": date(start_year, 3, 1),
            "period_end": date(start_year, 8, 31),
            "nominal_due_date": interim_nominal,
            "due_date": adjust_to_last_business_day(interim_nominal, overrides_path),
        },
        "annual": {
            "period_type": "annual",
            "period_name": f"Annual Reconciliation ({start_year}/03 - {end_year}/02)",
            "tax_year": label,
            "period_start": date(start_year, 3, 1),
            "period_end": date(end_year, 2, calendar.monthrange(end_year, 2)[1]),
            "nominal_due_date": annual_nominal,
            "due_date": adjust_to_last_business_day(annual_nominal, overrides_path),
        },
    }


# --- iCalendar (RFC 5545) helpers -------------------------------------------------

def _escape_text(value: str) -> str:
    """Escape a TEXT value (backslash, semicolon, comma, newline)."""
    return (
        value.replace("\\", "\\\\").replace(";", r"\;").replace(",", "\\,").replace("\n", "\\n")
    )


def _fold_line(line: str) -> list[str]:
    """Fold a content line so no physical line exceeds 75 octets (continuations start with a space)."""
    out: list[str] = []
    current = ""
    for ch in line:
        if len((current + ch).encode("utf-8")) > 75:
            out.append(current)
            current = " " + ch
        else:
            current += ch
    out.append(current)
    return out


def _event_lines(uid: str, summary: str, description: str, due: date) -> list[str]:
    lines = [
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTAMP:{ICS_DTSTAMP}",
        f"DTSTART;VALUE=DATE:{due.strftime('%Y%m%d')}",
        f"DTEND;VALUE=DATE:{(due + timedelta(days=1)).strftime('%Y%m%d')}",
        f"SUMMARY:{_escape_text(summary)}",
        f"DESCRIPTION:{_escape_text(description)}",
        "STATUS:CONFIRMED",
        "TRANSP:TRANSPARENT",
    ]
    for trigger, when in (("-P3D", "in 3 days"), ("-P1D", "tomorrow")):
        lines += [
            "BEGIN:VALARM",
            "ACTION:DISPLAY",
            f"DESCRIPTION:{_escape_text(f'Reminder: {summary} is due {when}')}",
            f"TRIGGER:{trigger}",
            "END:VALARM",
        ]
    lines.append("END:VEVENT")
    return lines


def generate_compliance_calendar_ics(year: int, overrides_path: Path | None = None) -> str:
    """RFC 5545 feed: 12 monthly EMP201 deadlines for the payroll year plus the EMP501
    interim/annual deadlines for the tax year starting in `year`. Reminders 3 days and 1 day before."""
    lines: list[str] = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//4mula//PayrollZA Compliance Calendar//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:4mula Payroll Compliance Deadlines {year}",
        "X-WR-TIMEZONE:Africa/Johannesburg",
        "REFRESH-INTERVAL;VALUE=DURATION:P1D",
        "X-PUBLISHED-TTL:PT24H",
    ]
    for m in range(1, 13):
        due = emp201_due_date(year, m, overrides_path)
        lines += _event_lines(
            uid=f"emp201-{year}-{m:02d}@4mula.co.za",
            summary=f"SARS EMP201 Due: {MONTH_NAMES[m]} {year} Payroll",
            description=(
                f"Statutory SARS EMP201 monthly declaration and payment deadline for {MONTH_NAMES[m]} "
                f"{year} payroll (PAYE, UIF, SDL). Final due date: {due.isoformat()}."
            ),
            due=due,
        )
    tax_year = f"{year}/{year + 1}"
    for key, p in emp501_periods(tax_year, overrides_path).items():
        lines += _event_lines(
            uid=f"emp501-{year}-{year + 1}-{key}@4mula.co.za",
            summary=f"SARS EMP501 {p['period_type'].capitalize()} Reconciliation Due ({tax_year})",
            description=(
                f"Statutory SARS EMP501 {p['period_name']} employer declaration and tax certificates "
                f"submission deadline. Final due date: {p['due_date'].isoformat()}."
            ),
            due=p["due_date"],
        )
    lines.append("END:VCALENDAR")
    folded = [piece for line in lines for piece in _fold_line(line)]
    return "\r\n".join(folded) + "\r\n"
