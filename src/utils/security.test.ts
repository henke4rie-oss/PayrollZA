/*
"""
Test Suite for Security & Compliance Engine
Verifies:
1. IDOR prevention and tenant boundary isolation
2. XSS input sanitization and script neutralization
3. POPIA identity and bank masking compliance
4. RBAC role permissions matrix
5. SARS TAA s29 5-year data retention compliance calculator
6. SHA-256 tamper-seal generation
"""
*/

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateTenantAccess,
  sanitizeInput,
  maskSouthAfricanId,
  maskBankAccount,
  hasPermission,
  checkRetentionCompliance,
  generateSha256Checksum,
} from './security';
import { storage } from './storage';

test('validateTenantAccess: blocks cross-tenant access attempts (IDOR)', () => {
  const allowed = validateTenantAccess('tenant-a', 'tenant-a', 'EmployeeRecord');
  assert.equal(allowed.allowed, true);
  assert.equal(allowed.error, undefined);

  const blocked = validateTenantAccess('tenant-a', 'tenant-b', 'PayrollRun');
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.error?.includes('IDOR Security Violation'));

  const missingContext = validateTenantAccess('', 'tenant-b');
  assert.equal(missingContext.allowed, false);
  assert.ok(missingContext.error?.includes('Missing tenant context'));
});

test('sanitizeInput: neutralizes malicious XSS script vectors and characters', () => {
  const malicious = '<script>stealTokens();</script><img src=x onerror="alert(1)">';
  const sanitized = sanitizeInput(malicious);
  assert.ok(!sanitized.includes('<script>'));
  assert.ok(!sanitized.includes('</script>'));
  assert.ok(!sanitized.includes('<img'));
  assert.ok(sanitized.includes('&lt;script&gt;'));
  assert.ok(sanitized.includes('&quot;'));
});

test('maskSouthAfricanId: masks 13-digit ID number to protect personal identity under POPIA', () => {
  const id = '8801155029084';
  const masked = maskSouthAfricanId(id);
  assert.equal(masked, '880115****084');

  // Should ignore or pass through invalid length safely
  assert.equal(maskSouthAfricanId('1234'), '1234');
  assert.equal(maskSouthAfricanId(''), '');
});

test('maskBankAccount: masks bank account numbers for payslip visibility', () => {
  assert.equal(maskBankAccount('62849102948'), '••••2948');
  assert.equal(maskBankAccount('123'), '••••');
  assert.equal(maskBankAccount(undefined), '••••');
});

test('hasPermission: enforces strict RBAC segregation of duties', () => {
  // Owner can manage billing
  assert.equal(hasPermission('owner', 'canManageBilling'), true);
  // Admin cannot manage billing (owner only for M&A transfer and pricing)
  assert.equal(hasPermission('admin', 'canManageBilling'), false);
  // Auditor cannot edit employees or run payroll
  assert.equal(hasPermission('auditor', 'canEditEmployees'), false);
  assert.equal(hasPermission('auditor', 'canRunPayroll'), false);
  assert.equal(hasPermission('auditor', 'canViewReports'), true);
  // Employee cannot export POPIA data or see audit logs
  assert.equal(hasPermission('employee', 'canExportPopiaData'), false);
  assert.equal(hasPermission('employee', 'canViewAuditLogs'), false);
});

test('checkRetentionCompliance: verifies 5-year SARS statutory retention rules', () => {
  const recentRun = new Date().toISOString();
  const recentCheck = checkRetentionCompliance(recentRun);
  assert.equal(recentCheck.isRetainedLegally, true);
  assert.ok(recentCheck.yearsRetained <= 1);

  // Date 6 years in the past: expired statutory retention
  const pastDate = new Date();
  pastDate.setFullYear(pastDate.getFullYear() - 6);
  const pastCheck = checkRetentionCompliance(pastDate.toISOString());
  assert.equal(pastCheck.isRetainedLegally, false);
  assert.ok(pastCheck.yearsRetained > 5);
});

test('generateSha256Checksum: generates deterministic 64-character hash', async () => {
  const payload = 'TEST_PAYROLL_RUN_VAN_WYK_AGRI_2026_02';
  const hash1 = await generateSha256Checksum(payload);
  const hash2 = await generateSha256Checksum(payload);
  assert.equal(hash1, hash2);
  assert.equal(hash1.length, 64);
});

test('License Engine: validates, applies activation keys and rejects expired/fraudulent codes', () => {
  const tenants = storage.getTenants();
  const testTenant = tenants[0];
  assert.ok(testTenant);

  // Rejects invalid code
  const badRes = storage.redeemLicenseKey(testTenant.id, 'INVALID-FAKE-CODE-XYZ');
  assert.equal(badRes.success, false);

  // Accepts valid founder 30-day code
  const goodRes = storage.redeemLicenseKey(testTenant.id, '4MULA-30DAY-2026');
  assert.equal(goodRes.success, true);
  assert.equal(goodRes.tier, 'pro');

  const status = storage.getTenantLicense(testTenant.id);
  assert.equal(status.status, 'active');
  assert.ok(status.daysRemaining >= 29);
});

