"""initial tables

Revision ID: 001_initial_tables
Revises: 
Create Date: 2026-03-01 00:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "001_initial_tables"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Tenants table
    op.create_table(
        "tenants",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("tenant_id", sa.String(64), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("trading_name", sa.String(255), nullable=True),
        sa.Column("registration_number", sa.String(64), nullable=True),
        sa.Column("sars_paye_number", sa.String(64), nullable=True),
        sa.Column("sars_uif_number", sa.String(64), nullable=True),
        sa.Column("sars_sdl_number", sa.String(64), nullable=True),
        sa.Column("sars_tax_year", sa.String(32), nullable=False, server_default="2026/2027"),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("is_sdl_exempt", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("tier", sa.String(32), nullable=False, server_default="free"),
        sa.Column("owner_id", sa.String(64), nullable=False),
        sa.Column("license_expiry", sa.String(64), nullable=True),
        sa.Column("active_license_code", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_tenants_id", "tenants", ["id"])
    op.create_index("ix_tenants_tenant_id", "tenants", ["tenant_id"])

    # 2. Employees table
    op.create_table(
        "employees",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("tenant_id", sa.String(64), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("employee_number", sa.String(64), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("id_number", sa.String(32), nullable=False),
        sa.Column("id_type", sa.String(16), nullable=False, server_default="rsa_id"),
        sa.Column("date_of_birth", sa.String(32), nullable=False),
        sa.Column("age", sa.Integer(), nullable=False),
        sa.Column("gender", sa.String(16), nullable=True),
        sa.Column("job_title", sa.String(128), nullable=False),
        sa.Column("department", sa.String(128), nullable=False),
        sa.Column("gross_monthly_salary", sa.Numeric(12, 2), nullable=False),
        sa.Column("start_date", sa.String(32), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("tax_number", sa.String(64), nullable=True),
        sa.Column("bank_name", sa.String(128), nullable=True),
        sa.Column("bank_account_number", sa.String(64), nullable=True),
        sa.Column("bank_branch_code", sa.String(32), nullable=True),
        sa.Column("medical_aid_members", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("pension_fund_percentage", sa.Numeric(5, 2), nullable=False, server_default="0.00"),
    )
    op.create_index("ix_employees_id", "employees", ["id"])
    op.create_index("ix_employees_tenant_id", "employees", ["tenant_id"])
    op.create_index("ix_employees_employee_number", "employees", ["employee_number"])
    op.create_index("ix_employees_id_number", "employees", ["id_number"])

    # 3. Payroll runs table
    op.create_table(
        "payroll_runs",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("tenant_id", sa.String(64), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("period", sa.String(16), nullable=False),
        sa.Column("company_name", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("finalized_at", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="draft"),
        sa.Column("finalized_by", sa.String(128), nullable=True),
        sa.Column("integrity_hash", sa.String(128), nullable=True),
        sa.Column("total_gross", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("total_paye", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("total_uif_employee", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("total_uif_employer", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("total_sdl", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("total_eti", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("total_net", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("total_employer_cost", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("employee_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_payroll_runs_id", "payroll_runs", ["id"])
    op.create_index("ix_payroll_runs_tenant_id", "payroll_runs", ["tenant_id"])
    op.create_index("ix_payroll_runs_period", "payroll_runs", ["period"])

    # 4. Payslips table
    op.create_table(
        "payslips",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("tenant_id", sa.String(64), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("payroll_run_id", sa.String(64), sa.ForeignKey("payroll_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("employee_id", sa.String(64), nullable=False),
        sa.Column("employee_number", sa.String(64), nullable=False),
        sa.Column("employee_name", sa.String(255), nullable=False),
        sa.Column("period", sa.String(16), nullable=False),
        sa.Column("age", sa.Integer(), nullable=False),
        sa.Column("gross_monthly", sa.Numeric(12, 2), nullable=False),
        sa.Column("paye", sa.Numeric(12, 2), nullable=False),
        sa.Column("uif_employee", sa.Numeric(12, 2), nullable=False),
        sa.Column("uif_employer", sa.Numeric(12, 2), nullable=False),
        sa.Column("sdl", sa.Numeric(12, 2), nullable=False),
        sa.Column("eti", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("net_pay", sa.Numeric(12, 2), nullable=False),
        sa.Column("total_employer_cost", sa.Numeric(12, 2), nullable=False),
        sa.Column("generated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_payslips_id", "payslips", ["id"])
    op.create_index("ix_payslips_tenant_id", "payslips", ["tenant_id"])
    op.create_index("ix_payslips_payroll_run_id", "payslips", ["payroll_run_id"])
    op.create_index("ix_payslips_employee_id", "payslips", ["employee_id"])

    # 5. Audit logs table
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("tenant_id", sa.String(64), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("timestamp", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("actor_email", sa.String(255), nullable=False),
        sa.Column("actor_role", sa.String(32), nullable=False),
        sa.Column("action", sa.String(128), nullable=False),
        sa.Column("category", sa.String(64), nullable=False),
        sa.Column("details", sa.Text(), nullable=False),
        sa.Column("ip_address", sa.String(64), nullable=True),
        sa.Column("security_flag", sa.String(32), nullable=False, server_default="normal"),
    )
    op.create_index("ix_audit_logs_id", "audit_logs", ["id"])
    op.create_index("ix_audit_logs_tenant_id", "audit_logs", ["tenant_id"])
    op.create_index("ix_audit_logs_timestamp", "audit_logs", ["timestamp"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("payslips")
    op.drop_table("payroll_runs")
    op.drop_table("employees")
    op.drop_table("tenants")
