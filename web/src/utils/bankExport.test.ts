/*
"""
Test Suite for South African Bank Batch Payment (EFT) Export Engine
Verifies:
1. buildBankBatchRows maps payslip net amounts and employee banking details accurately
2. Universal Bank CSV format (Standard Bank, Capitec, Nedbank, Absa)
3. FNB Online Banking Enterprise CSV layout
4. Standard Bank Business Online CSV layout
5. Total batch sum & headcount reconciliation (Zero financial discrepancies)
"""
*/

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBankBatchRows, generateBankBatchFile } from './bankExport';
import { Employee, PayrollRun, Payslip } from '../types';

// # Mock Data conforming to Employee, Payslip, and PayrollRun interfaces
const mockEmployees: Employee[] = [
  {
    id: 'emp-1',
    tenantId: 'tenant-1',
    employeeNumber: 'EMP001',
    fullName: 'Sipho Ndlovu',
    idNumber: '8801155029084',
    idType: 'rsa_id',
    dateOfBirth: '1988-01-15',
    age: 36,
    gender: 'M',
    jobTitle: 'Senior Agronomist',
    department: 'Operations',
    grossMonthlySalary: 35000,
    startDate: '2021-03-01',
    isActive: true,
    taxNumber: '9123456789',
    bankName: 'First National Bank',
    bankAccountNumber: '62849102948',
    bankBranchCode: '250655',
  },
  {
    id: 'emp-2',
    tenantId: 'tenant-1',
    employeeNumber: 'EMP002',
    fullName: 'Johan van der Merwe',
    idNumber: '9506205088089',
    idType: 'rsa_id',
    dateOfBirth: '1995-06-20',
    age: 29,
    gender: 'M',
    jobTitle: 'Logistics Lead',
    department: 'Logistics',
    grossMonthlySalary: 28000,
    startDate: '2022-07-15',
    isActive: true,
    taxNumber: '9234567890',
    bankName: 'Standard Bank',
    bankAccountNumber: '10148291034',
    bankBranchCode: '051001',
  },
];

const mockPayslips: Payslip[] = [
  {
    id: 'slip-1',
    tenantId: 'tenant-1',
    payrollRunId: 'run-1',
    employeeId: 'emp-1',
    employeeNumber: 'EMP001',
    employeeName: 'Sipho Ndlovu',
    period: '2026/02',
    age: 36,
    grossMonthly: 35000,
    paye: 4892.5,
    uifEmployee: 177.12,
    uifEmployer: 177.12,
    sdl: 350,
    eti: 0,
    netPay: 29930.38,
    totalEmployerCost: 35527.12,
    generatedAt: '2026-02-28T12:00:00Z',
  },
  {
    id: 'slip-2',
    tenantId: 'tenant-1',
    payrollRunId: 'run-1',
    employeeId: 'emp-2',
    employeeNumber: 'EMP002',
    employeeName: 'Johan van der Merwe',
    period: '2026/02',
    age: 29,
    grossMonthly: 28000,
    paye: 3241.5,
    uifEmployee: 177.12,
    uifEmployer: 177.12,
    sdl: 280,
    eti: 0,
    netPay: 24581.38,
    totalEmployerCost: 28457.12,
    generatedAt: '2026-02-28T12:00:00Z',
  },
];

const mockPayrollRun: PayrollRun = {
  id: 'run-1',
  tenantId: 'tenant-1',
  period: '2026/02',
  companyName: 'Van Wyk Agri Enterprises',
  createdAt: '2026-02-28T12:00:00Z',
  status: 'finalized',
  payslips: mockPayslips,
  totalGross: 63000,
  totalPaye: 8134.0,
  totalUifEmployee: 354.24,
  totalUifEmployer: 354.24,
  totalSdl: 630,
  totalEti: 0,
  totalNet: 54511.76,
  totalEmployerCost: 63984.24,
  employeeCount: 2,
  integrityHash: 'mock-run-seal',
};

test('buildBankBatchRows: correctly builds batch rows from payroll run and employee registry', () => {
  const rows = buildBankBatchRows(mockPayrollRun, mockEmployees);
  assert.equal(rows.length, 2);

  const row1 = rows[0];
  assert.equal(row1.employeeCode, 'EMP001');
  assert.equal(row1.fullName, 'Sipho Ndlovu');
  assert.equal(row1.bankName, 'First National Bank');
  assert.equal(row1.bankAccountNumber, '62849102948');
  assert.equal(row1.bankBranchCode, '250655');
  assert.equal(row1.netAmountZAR, 29930.38);
  assert.equal(row1.paymentReference, 'SALARY-202602-EMP001');

  const row2 = rows[1];
  assert.equal(row2.employeeCode, 'EMP002');
  assert.equal(row2.fullName, 'Johan van der Merwe');
  assert.equal(row2.bankName, 'Standard Bank');
  assert.equal(row2.bankAccountNumber, '10148291034');
  assert.equal(row2.netAmountZAR, 24581.38);
});

test('generateBankBatchFile: Universal Bank CSV output verification', () => {
  const rows = buildBankBatchRows(mockPayrollRun, mockEmployees);
  const result = generateBankBatchFile(rows, 'Van Wyk Agri (Pty) Ltd', 'universal_csv');

  assert.equal(result.filename, 'Universal_Bank_EFT_Van_Wyk_Agri__Pty__Ltd.csv');
  assert.equal(result.count, 2);
  assert.equal(result.totalAmount, 54511.76);

  const lines = result.content.split('\n');
  assert.equal(lines[0], 'Beneficiary Name,Bank Name,Account Number,Branch Code,Amount (ZAR),Own Reference,Beneficiary Reference');
  assert.ok(lines[1].includes('"Sipho Ndlovu"'));
  assert.ok(lines[1].includes('29930.38'));
  assert.ok(lines[2].includes('"Johan van der Merwe"'));
  assert.ok(lines[2].includes('24581.38'));
});

test('generateBankBatchFile: FNB Online Banking Enterprise CSV output verification', () => {
  const rows = buildBankBatchRows(mockPayrollRun, mockEmployees);
  const result = generateBankBatchFile(rows, 'Van Wyk Agri', 'fnb_enterprise');

  assert.equal(result.filename, 'FNB_EFT_Batch_Van_Wyk_Agri.csv');
  assert.equal(result.count, 2);
  assert.equal(result.totalAmount, 54511.76);

  const lines = result.content.split('\n');
  assert.equal(lines[0], 'Recipient Name,Account Number,Account Type,Branch Code,Amount,Own Reference,Recipient Reference');
  assert.ok(lines[1].includes('"Sipho Ndlovu","62849102948",1,"250655",29930.38'));
});

test('generateBankBatchFile: Standard Bank Business Online CSV output verification', () => {
  const rows = buildBankBatchRows(mockPayrollRun, mockEmployees);
  const result = generateBankBatchFile(rows, 'Van Wyk Agri', 'standard_bank');

  assert.equal(result.filename, 'StandardBank_EFT_Batch_Van_Wyk_Agri.csv');
  assert.equal(result.count, 2);
  assert.equal(result.totalAmount, 54511.76);

  const lines = result.content.split('\n');
  assert.equal(lines[0], 'Beneficiary Name,Branch Code,Account Number,Amount,Statement Reference');
  assert.ok(lines[1].includes('"Sipho Ndlovu","250655","62849102948",29930.38'));
});
