from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from api.app.database import Base


def get_utc_now():
    return datetime.now(UTC).replace(tzinfo=None)


# Tenant / Organization workspace table
class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    trading_name = Column(String(255), nullable=True)
    registration_number = Column(String(64), nullable=True)
    sars_paye_number = Column(String(64), nullable=True)
    sars_uif_number = Column(String(64), nullable=True)
    sars_sdl_number = Column(String(64), nullable=True)
    sars_tax_year = Column(String(32), nullable=False, default="2026/2027")
    address = Column(Text, nullable=True)
    is_sdl_exempt = Column(Boolean, nullable=False, default=False)
    tier = Column(String(32), nullable=False, default="free")
    owner_id = Column(String(64), nullable=False)
    license_expiry = Column(String(64), nullable=True)
    active_license_code = Column(String(64), nullable=True)
    created_at = Column(DateTime, nullable=False, default=get_utc_now)

    # Relationships
    employees = relationship("Employee", back_populates="tenant", cascade="all, delete-orphan")
    payroll_runs = relationship("PayrollRun", back_populates="tenant", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="tenant", cascade="all, delete-orphan")


# Employee records table
class Employee(Base):
    __tablename__ = "employees"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_number = Column(String(64), nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    id_number = Column(String(32), nullable=False, index=True)
    id_type = Column(String(16), nullable=False, default="rsa_id")
    date_of_birth = Column(String(32), nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(16), nullable=True)
    job_title = Column(String(128), nullable=False)
    department = Column(String(128), nullable=False)
    gross_monthly_salary = Column(Numeric(12, 2), nullable=False)
    start_date = Column(String(32), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    tax_number = Column(String(64), nullable=True)
    bank_name = Column(String(128), nullable=True)
    bank_account_number = Column(String(64), nullable=True)
    bank_branch_code = Column(String(32), nullable=True)
    medical_aid_members = Column(Integer, nullable=False, default=0)
    pension_fund_percentage = Column(Numeric(5, 2), nullable=False, default=0.00)

    # Relationship to Tenant
    tenant = relationship("Tenant", back_populates="employees")


# Monthly payroll run table
class PayrollRun(Base):
    __tablename__ = "payroll_runs"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    period = Column(String(16), nullable=False, index=True)
    company_name = Column(String(255), nullable=False)
    created_at = Column(DateTime, nullable=False, default=get_utc_now)
    finalized_at = Column(DateTime, nullable=True)
    status = Column(String(32), nullable=False, default="draft")
    finalized_by = Column(String(128), nullable=True)
    integrity_hash = Column(String(128), nullable=True)
    total_gross = Column(Numeric(12, 2), nullable=False, default=0.00)
    total_paye = Column(Numeric(12, 2), nullable=False, default=0.00)
    total_uif_employee = Column(Numeric(12, 2), nullable=False, default=0.00)
    total_uif_employer = Column(Numeric(12, 2), nullable=False, default=0.00)
    total_sdl = Column(Numeric(12, 2), nullable=False, default=0.00)
    total_eti = Column(Numeric(12, 2), nullable=False, default=0.00)
    total_net = Column(Numeric(12, 2), nullable=False, default=0.00)
    total_employer_cost = Column(Numeric(12, 2), nullable=False, default=0.00)
    employee_count = Column(Integer, nullable=False, default=0)

    # Relationships
    tenant = relationship("Tenant", back_populates="payroll_runs")
    payslips = relationship("Payslip", back_populates="payroll_run", cascade="all, delete-orphan")


# Individual payslips table
class Payslip(Base):
    __tablename__ = "payslips"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    payroll_run_id = Column(String(64), ForeignKey("payroll_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id = Column(String(64), nullable=False, index=True)
    employee_number = Column(String(64), nullable=False)
    employee_name = Column(String(255), nullable=False)
    period = Column(String(16), nullable=False)
    age = Column(Integer, nullable=False)
    gross_monthly = Column(Numeric(12, 2), nullable=False)
    paye = Column(Numeric(12, 2), nullable=False)
    uif_employee = Column(Numeric(12, 2), nullable=False)
    uif_employer = Column(Numeric(12, 2), nullable=False)
    sdl = Column(Numeric(12, 2), nullable=False)
    eti = Column(Numeric(12, 2), nullable=False, default=0.00)
    net_pay = Column(Numeric(12, 2), nullable=False)
    total_employer_cost = Column(Numeric(12, 2), nullable=False)
    generated_at = Column(DateTime, nullable=False, default=get_utc_now)

    # Relationship to PayrollRun
    payroll_run = relationship("PayrollRun", back_populates="payslips")


# Immutable cryptographic audit log table
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(64), primary_key=True, index=True)
    tenant_id = Column(String(64), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, default=get_utc_now, index=True)
    actor_email = Column(String(255), nullable=False)
    actor_role = Column(String(32), nullable=False)
    action = Column(String(128), nullable=False)
    category = Column(String(64), nullable=False)
    details = Column(Text, nullable=False)
    ip_address = Column(String(64), nullable=True)
    security_flag = Column(String(32), nullable=False, default="normal")

    # Relationship to Tenant
    tenant = relationship("Tenant", back_populates="audit_logs")
