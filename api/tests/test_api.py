from decimal import Decimal

from fastapi.testclient import TestClient

from api.app.main import app

client = TestClient(app)


# 1. Test /health endpoint
def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "database" in data


# 2. Test /payroll/calculate with Anchor 1 (gross 10,000, age 30)
def test_payroll_calculate_anchor1():
    payload = {
        "gross_monthly": "10000.00",
        "age": 30,
        "sdl_exempt": False,
    }
    response = client.post("/payroll/calculate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert Decimal(str(data["annual_paye"])) == Decimal("3780.00")
    assert Decimal(str(data["monthly_paye"])) == Decimal("315.00")
    assert Decimal(str(data["uif_employee"])) == Decimal("100.00")
    assert Decimal(str(data["net_pay"])) == Decimal("9585.00")


# 3. Test /payroll/calculate with below-threshold salary (gross 8,250, age 30)
def test_payroll_calculate_below_threshold():
    payload = {
        "gross_monthly": "8250.00",
        "age": 30,
        "sdl_exempt": False,
    }
    response = client.post("/payroll/calculate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert Decimal(str(data["monthly_paye"])) == Decimal("0.00")
    assert data["is_below_threshold"] is True
    assert Decimal(str(data["net_pay"])) == Decimal("8167.50")


# 4. Test /payroll/calculate with SDL exemption
def test_payroll_calculate_sdl_exemption():
    payload = {
        "gross_monthly": "20000.00",
        "age": 30,
        "sdl_exempt": True,
    }
    response = client.post("/payroll/calculate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert Decimal(str(data["sdl_amount"])) == Decimal("0.00")


# 5. Test /payroll/calculate with negative salary returns 400 Bad Request
def test_payroll_calculate_negative_salary_returns_400():
    payload = {
        "gross_monthly": "-500.00",
        "age": 30,
    }
    response = client.post("/payroll/calculate", json=payload)
    assert response.status_code == 400
    assert "Gross monthly salary cannot be negative" in response.json()["detail"]


# 6. Test /payroll/calculate with invalid age returns 400 Bad Request
def test_payroll_calculate_invalid_age_returns_400():
    payload = {
        "gross_monthly": "10000.00",
        "age": 12,
    }
    response = client.post("/payroll/calculate", json=payload)
    assert response.status_code == 400
    assert "Age must be between 16 and 100" in response.json()["detail"]


# 7. Test /payroll/calculate with malformed types returns 422 Unprocessable Entity
def test_payroll_calculate_malformed_input_returns_422():
    payload = {
        "gross_monthly": "not-a-number",
        "age": "invalid-age",
    }
    response = client.post("/payroll/calculate", json=payload)
    assert response.status_code == 422


# 8. Test /sa-id/validate with valid South African ID
def test_sa_id_validate_valid():
    payload = {"id_number": "8001015009087"}
    response = client.post("/sa-id/validate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_valid"] is True
    assert data["gender"] == "M"
    assert data["is_citizen"] is True
    assert data["error"] is None


# 9. Test /sa-id/validate with invalid checksum
def test_sa_id_validate_bad_checksum():
    payload = {"id_number": "8001015009084"}
    response = client.post("/sa-id/validate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_valid"] is False
    assert "checksum" in data["error"]


# 10. Test /sa-id/validate with missing payload field returns 422
def test_sa_id_validate_missing_field_returns_422():
    response = client.post("/sa-id/validate", json={})
    assert response.status_code == 422
