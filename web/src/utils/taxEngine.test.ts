import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAnnualPaye,
  calculateUifEmployee,
  calculateUifEmployer,
  calculateSdl,
  calculateEti,
  calculatePayroll,
  validateSouthAfricanId,
  isBelowTaxThreshold,
  calculateRebates,
  calculateAgeFromDateOfBirth,
} from './taxEngine';
import { INITIAL_EMPLOYEES } from './storage';

test('Tax Thresholds: Under 65 tax threshold is R99,000', () => {
  assert.equal(isBelowTaxThreshold(99000, 30), true);
  assert.equal(isBelowTaxThreshold(99001, 30), false);
  // Age 65-74 threshold is R153,250
  assert.equal(isBelowTaxThreshold(153250, 66), true);
  assert.equal(isBelowTaxThreshold(153251, 66), false);
  // Age 75+ threshold is R171,300
  assert.equal(isBelowTaxThreshold(171300, 76), true);
  assert.equal(isBelowTaxThreshold(171301, 76), false);
});

test('Rebates: Calculates correct primary, secondary, tertiary rebates by age', () => {
  const young = calculateRebates(30);
  assert.equal(young.primary, 17820);
  assert.equal(young.secondary, 0);
  assert.equal(young.tertiary, 0);
  assert.equal(young.total, 17820);

  const senior = calculateRebates(66);
  assert.equal(senior.primary, 17820);
  assert.equal(senior.secondary, 9765);
  assert.equal(senior.tertiary, 0);
  assert.equal(senior.total, 17820 + 9765);

  const elderly = calculateRebates(76);
  assert.equal(elderly.primary, 17820);
  assert.equal(elderly.secondary, 9765);
  assert.equal(elderly.tertiary, 3249);
  assert.equal(elderly.total, 17820 + 9765 + 3249);
});

test('SARS Bracket Calculation: R360,000 annual salary for 34-year old', () => {
  // Annual gross: R360,000
  // Bracket: 245,100 - 383,100 (rate 26%, base 44,118)
  // Tax before rebate = 44,118 + 0.26 * (360,000 - 245,100) = 44,118 + 29,874 = 73,992
  // Minus primary rebate 17,820 = 56,172
  const result = calculateAnnualPaye(360000, 34);
  assert.equal(result.taxBeforeRebate, 73992);
  assert.equal(result.taxAfterRebate, 56172);
  assert.equal(result.marginalRate, 0.26);
  assert.equal(result.isBelowThreshold, false);
});

test('UIF Ceiling: Caps deduction at monthly ceiling of R17,712 (R177.12)', () => {
  // Below ceiling
  assert.equal(calculateUifEmployee(10000), 100);
  assert.equal(calculateUifEmployer(10000), 100);

  // At or above ceiling (e.g. R35,000 salary)
  assert.equal(calculateUifEmployee(35000), 177.12);
  assert.equal(calculateUifEmployer(35000), 177.12);

  // Exact ceiling
  assert.equal(calculateUifEmployee(17712), 177.12);
});

test('SDL Calculation and R500,000 exemption rule', () => {
  // 1% of gross when not exempt
  assert.equal(calculateSdl(35000, false), 350.00);

  // 0 when company is exempt under R500,000 annual payroll rule
  assert.equal(calculateSdl(35000, true), 0);
});

test('ETI: Employment Tax Incentive for qualifying youth employees (18-29)', () => {
  // Disqualified if age is 35
  assert.equal(calculateEti(4000, 35), 0);

  // Disqualified if salary > R7,500
  assert.equal(calculateEti(8000, 22), 0);

  // Qualifying: age 23, salary R4,000 -> 37.5% = R1,500
  assert.equal(calculateEti(4000, 23), 1500);

  // Qualifying: age 24, salary R5,500 -> 1500 - 0.5 * (5500 - 4500) = 1500 - 500 = 1000
  assert.equal(calculateEti(5500, 24), 1000);
});

test('Full Payroll Run: Monthly breakdown calculations', () => {
  const result = calculatePayroll(30000, 34, false);
  // Gross annual = 360,000
  // Monthly PAYE = 56,172 / 12 = 4,681.00
  assert.equal(result.grossMonthly, 30000);
  assert.equal(result.monthlyPaye, 4681.00);
  assert.equal(result.uifEmployee, 177.12);
  assert.equal(result.uifEmployer, 177.12);
  assert.equal(result.sdlAmount, 300.00);
  // Net pay = 30000 - 4681.00 - 177.12 = 25141.88
  assert.equal(result.netPay, 25141.88);
  // Employer cost = 30000 + 177.12 + 300 = 30477.12
  assert.equal(result.totalEmployerCost, 30477.12);
});

test('SA ID Validation: rejects invalid lengths and bad checksums', () => {
  assert.equal(validateSouthAfricanId('12345').isValid, false);
  // 8001015009087 has check digit 7; change last digit to 4 -> invalid checksum:
  assert.equal(validateSouthAfricanId('8001015009084').isValid, false);
  // Valid ID test:
  const valid = validateSouthAfricanId('8001015009087');
  assert.equal(valid.isValid, true);
  assert.equal(valid.gender, 'M');
  assert.equal(valid.isCitizen, true);
});

test('calculateAgeFromDateOfBirth: derives age correctly for day before, of, and after birthday', () => {
  const dob = '2000-05-15';

  // Day before birthday (May 14, 2026)
  const dayBefore = new Date(2026, 4, 14);
  assert.equal(calculateAgeFromDateOfBirth(dob, dayBefore), 25);

  // Exact birthday (May 15, 2026)
  const birthday = new Date(2026, 4, 15);
  assert.equal(calculateAgeFromDateOfBirth(dob, birthday), 26);

  // Day after birthday (May 16, 2026)
  const dayAfter = new Date(2026, 4, 16);
  assert.equal(calculateAgeFromDateOfBirth(dob, dayAfter), 26);
});

test('Seeded Employee IDs: all 4 seeded employee IDs pass validateSouthAfricanId', () => {
  assert.equal(INITIAL_EMPLOYEES.length, 4);
  for (const emp of INITIAL_EMPLOYEES) {
    const res = validateSouthAfricanId(emp.idNumber);
    assert.equal(res.isValid, true, `Seeded ID ${emp.idNumber} for ${emp.fullName} must pass validation`);
  }
});
