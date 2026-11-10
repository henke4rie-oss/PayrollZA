from datetime import date

import pytest
from fastapi.testclient import TestClient

from api.app.compliance import (
    adjust_to_last_business_day,
    emp201_due_date,
    emp501_periods,
    generate_compliance_calendar_ics,
    is_sa_business_day,
)
from api.app.main import app

client = TestClient(app)


# 1. Exact anchors from specification
@pytest.mark.parametrize(
    "year, month, expected_due_date, working_note",
    [
        # October 2026 payroll: 7th Nov 2026 is a Saturday, so due Friday 6 Nov 2026
        (2026, 10, date(2026, 11, 6), "7 Nov 2026 is Saturday -> rolled back to Fri 6 Nov 2026"),
        # January 2027 payroll: 7th Feb 2027 is a Sunday, so due Friday 5 Feb 2027
        (2027, 1, date(2027, 2, 5), "7 Feb 2027 is Sunday -> rolled back to Fri 5 Feb 2027"),
        # February 2027 payroll: 7th Mar 2027 is a Sunday, so due Friday 5 Mar 2027
        (2027, 2, date(2027, 3, 5), "7 Mar 2027 is Sunday -> rolled back to Fri 5 Mar 2027"),
        # November 2026 payroll: 7th Dec 2026 is a Monday (weekday), unchanged
        (2026, 11, date(2026, 12, 7), "7 Dec 2026 is Monday -> unchanged"),
        # December 2026 payroll: 7th Jan 2027 is a Thursday (weekday), unchanged
        (2026, 12, date(2027, 1, 7), "7 Jan 2027 is Thursday -> unchanged"),
    ],
)
def test_emp201_due_date_anchors(year: int, month: int, expected_due_date: date, working_note: str):
    actual = emp201_due_date(year, month)
    assert actual == expected_due_date, f"Failed for payroll {year}-{month:02d}: {working_note}"


def test_emp201_invalid_month_raises_value_error():
    with pytest.raises(ValueError):
        emp201_due_date(2026, 0)

    with pytest.raises(ValueError):
        emp201_due_date(2026, 13)


def test_holiday_overrides_ad_hoc_addition_and_removal(tmp_path):
    # Prepare a temporary override JSON file
    override_file = tmp_path / "test_holiday_overrides.json"
    override_file.write_text(
        """{
            "added": {
                "2026-12-07": "Declared Special Public Holiday"
            },
            "removed": [
                "2026-12-16"
            ]
        }""",
        encoding="utf-8",
    )

    # 7 Dec 2026 is normally a Monday. With the added holiday, the due date for Nov 2026 payroll
    # must roll back before Monday 7th, Sunday 6th, and Saturday 5th to Friday 4 Dec 2026.
    due_date = emp201_due_date(2026, 11, overrides_path=override_file)
    assert due_date == date(2026, 12, 4)

    # 16 Dec 2026 is Day of Reconciliation (SA public holiday). Because it was removed in overrides,
    # it should now count as a normal business day.
    assert is_sa_business_day(date(2026, 12, 16), overrides_path=override_file) is True


def test_emp501_periods_schedule():
    # Tax year 2026/2027 runs from 1 March 2026 to 28 February 2027
    periods = emp501_periods("2026/2027")

    interim = periods["interim"]
    assert interim["period_start"] == date(2026, 3, 1)
    assert interim["period_end"] == date(2026, 8, 31)
    assert interim["nominal_due_date"] == date(2026, 10, 31)
    # 31 Oct 2026 is Saturday -> rolled back to Friday 30 Oct 2026
    assert interim["due_date"] == date(2026, 10, 30)

    annual = periods["annual"]
    assert annual["period_start"] == date(2026, 3, 1)
    assert annual["period_end"] == date(2027, 2, 28)
    assert annual["nominal_due_date"] == date(2027, 5, 31)
    # 31 May 2027 is Monday -> unchanged
    assert annual["due_date"] == date(2027, 5, 31)


def test_emp501_periods_invalid_tax_year():
    with pytest.raises(ValueError):
        emp501_periods("invalid-tax-year")


def test_calendar_ics_structure():
    ics_text = generate_compliance_calendar_ics(2026)

    # RFC 5545 envelope requirements
    assert "BEGIN:VCALENDAR" in ics_text
    assert "END:VCALENDAR" in ics_text
    assert "VERSION:2.0" in ics_text
    assert "PRODID:" in ics_text

    # Events present
    assert "BEGIN:VEVENT" in ics_text
    assert "END:VEVENT" in ics_text

    # Deadlines represented
    assert "EMP201" in ics_text
    assert "EMP501" in ics_text

    # Stable UIDs
    assert "UID:emp201-2026-" in ics_text
    assert "UID:emp501-2026-2027-" in ics_text

    # Reminders 3 days and 1 day before
    assert "BEGIN:VALARM" in ics_text
    assert "TRIGGER:-P3D" in ics_text
    assert "TRIGGER:-P1D" in ics_text
    assert "END:VALARM" in ics_text

    # CRLF line endings per RFC 5545
    assert "\r\n" in ics_text


def test_calendar_endpoint():
    response = client.get("/compliance/calendar.ics?year=2026")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/calendar")
    body = response.text
    assert "BEGIN:VCALENDAR" in body
    assert "SUMMARY:" in body
    assert "TRIGGER:-P3D" in body
    assert "TRIGGER:-P1D" in body
    assert "END:VCALENDAR" in body


def test_calendar_endpoint_invalid_year():
    response = client.get("/compliance/calendar.ics?year=abcd")
    assert response.status_code in (400, 422)

    response = client.get("/compliance/calendar.ics?year=1800")
    assert response.status_code in (400, 422)


# --- Independent checks added after review (expected values hand-derived, not from the code) ---


def _unfold(ics_text: str) -> str:
    """RFC 5545 unfolding: CRLF followed by a space continues the previous line."""
    return ics_text.replace("\r\n ", "")


def _event(ics_text: str, uid: str) -> str:
    text = _unfold(ics_text)
    start = text.index(f"UID:{uid}")
    return text[start : text.index("END:VEVENT", start)]


def test_calendar_event_dates_are_correct():
    ics = generate_compliance_calendar_ics(2026)
    # Oct 2026 payroll: 7 Nov 2026 is a Saturday -> Fri 6 Nov 2026
    assert "DTSTART;VALUE=DATE:20261106" in _event(ics, "emp201-2026-10@4mula.co.za")
    # Dec 2026 payroll: 7 Jan 2027 is a Thursday -> unchanged
    assert "DTSTART;VALUE=DATE:20270107" in _event(ics, "emp201-2026-12@4mula.co.za")
    # EMP501 interim 2026/27: 31 Oct 2026 is a Saturday -> Fri 30 Oct 2026
    assert "DTSTART;VALUE=DATE:20261030" in _event(ics, "emp501-2026-2027-interim@4mula.co.za")


def test_calendar_lines_are_folded_to_75_octets():
    ics = generate_compliance_calendar_ics(2026)
    for line in ics.split("\r\n"):
        assert len(line.encode("utf-8")) <= 75, line


def test_calendar_text_values_are_escaped():
    ics = _unfold(generate_compliance_calendar_ics(2026))
    assert "(PAYE\\, UIF\\, SDL)" in ics


def test_real_public_holidays_are_not_business_days():
    # Day of Reconciliation, Wed 16 Dec 2026 -> previous business day is Tue 15 Dec
    assert adjust_to_last_business_day(date(2026, 12, 16)) == date(2026, 12, 15)
    # Easter 2027: Good Friday 26 Mar, Family Day Mon 29 Mar
    assert is_sa_business_day(date(2027, 3, 26)) is False
    assert is_sa_business_day(date(2027, 3, 29)) is False
    # Human Rights Day (21 Mar 2027) is a Sunday, so Monday 22 Mar is the public holiday
    assert is_sa_business_day(date(2027, 3, 22)) is False
    # An ordinary Tuesday
    assert is_sa_business_day(date(2027, 3, 23)) is True


def test_malformed_override_file_fails_loudly(tmp_path):
    bad_json = tmp_path / "bad.json"
    bad_json.write_text("{not json", encoding="utf-8")
    with pytest.raises(ValueError):
        emp201_due_date(2026, 11, overrides_path=bad_json)

    bad_date = tmp_path / "bad_date.json"
    bad_date.write_text('{"added": {"2026-13-45": "typo"}, "removed": []}', encoding="utf-8")
    with pytest.raises(ValueError):
        emp201_due_date(2026, 11, overrides_path=bad_date)
