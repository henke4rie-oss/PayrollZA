/**
 * South African Revenue Service (SARS) Tax Engine 2026 / 2027
 * Compliant with Income Tax Act No. 58 of 1962, UICA No. 4 of 2002,
 * SDLA No. 9 of 1999, and ETI Act No. 26 of 2013.
 */

import { TaxCalculationBreakdown } from '../types';

export interface TaxBracket {
  threshold: number;
  upper: number | null;
  rate: number;
  baseTax: number;
}

export const SARS_2027_CONFIG = {
  country: 'ZA',
  taxYear: '2026/2027',
  currency: 'ZAR',
  brackets: [
    { threshold: 0, upper: 245100, rate: 0.18, baseTax: 0 },
    { threshold: 245100, upper: 383100, rate: 0.26, baseTax: 44118 },
    { threshold: 383100, upper: 530200, rate: 0.31, baseTax: 79998 },
    { threshold: 530200, upper: 695800, rate: 0.36, baseTax: 125599 },
    { threshold: 695800, upper: 887000, rate: 0.39, baseTax: 185215 },
    { threshold: 887000, upper: 1878600, rate: 0.41, baseTax: 259783 },
    { threshold: 1878600, upper: null, rate: 0.45, baseTax: 666339 },
  ] as TaxBracket[],
  rebates: {
    primary: 17820,
    secondary: 9765, // Age 65+
    tertiary: 3249,  // Age 75+
  },
  rebateAgeThresholds: {
    primary: 0,
    secondary: 65,
    tertiary: 75,
  },
  taxThresholds: {
    under65: 99000,
    age65to74: 153250,
    age75plus: 171300,
  },
  uif: {
    employeeRate: 0.01,
    employerRate: 0.01,
    monthlyCeiling: 17712, // Max R177.12 deduction each
  },
  sdl: {
    rate: 0.01,
    annualPayrollThreshold: 500000, // Exempt if employer total annual payroll <= R500,000
  },
  eti: {
    minAge: 18,
    maxAge: 29,
    minSalary: 2000,
    maxSalary: 7500,
    maxIncentive: 1500,
  },
};

/**
 * Calculates sum of SARS tax rebates based on age.
 */
export function calculateRebates(age: number): {
  primary: number;
  secondary: number;
  tertiary: number;
  total: number;
} {
  const primary = SARS_2027_CONFIG.rebates.primary;
  const secondary = age >= SARS_2027_CONFIG.rebateAgeThresholds.secondary
    ? SARS_2027_CONFIG.rebates.secondary
    : 0;
  const tertiary = age >= SARS_2027_CONFIG.rebateAgeThresholds.tertiary
    ? SARS_2027_CONFIG.rebates.tertiary
    : 0;

  return {
    primary,
    secondary,
    tertiary,
    total: primary + secondary + tertiary,
  };
}

/**
 * Checks if annual gross is below the tax-free threshold.
 */
export function isBelowTaxThreshold(grossAnnual: number, age: number): boolean {
  if (age >= 75) {
    return grossAnnual <= SARS_2027_CONFIG.taxThresholds.age75plus;
  }
  if (age >= 65) {
    return grossAnnual <= SARS_2027_CONFIG.taxThresholds.age65to74;
  }
  return grossAnnual <= SARS_2027_CONFIG.taxThresholds.under65;
}

/**
 * Calculate annual PAYE before and after rebates.
 */
export function calculateAnnualPaye(grossAnnual: number, age: number): {
  taxBeforeRebate: number;
  taxAfterRebate: number;
  marginalRate: number;
  isBelowThreshold: boolean;
  rebates: ReturnType<typeof calculateRebates>;
} {
  const rebates = calculateRebates(age);

  if (grossAnnual <= 0) {
    return {
      taxBeforeRebate: 0,
      taxAfterRebate: 0,
      marginalRate: 0.18,
      isBelowThreshold: true,
      rebates,
    };
  }

  if (isBelowTaxThreshold(grossAnnual, age)) {
    return {
      taxBeforeRebate: 0,
      taxAfterRebate: 0,
      marginalRate: 0.18,
      isBelowThreshold: true,
      rebates,
    };
  }

  let tax = 0;
  let marginalRate = 0.18;

  for (const bracket of SARS_2027_CONFIG.brackets) {
    if (bracket.upper === null || grossAnnual <= bracket.upper) {
      tax = bracket.baseTax + ((grossAnnual - bracket.threshold) * bracket.rate);
      marginalRate = bracket.rate;
      break;
    }
  }

  const taxAfterRebate = Math.max(0, Math.round((tax - rebates.total) * 100) / 100);

  return {
    taxBeforeRebate: Math.round(tax * 100) / 100,
    taxAfterRebate,
    marginalRate,
    isBelowThreshold: false,
    rebates,
  };
}

/**
 * Calculate employee UIF contribution (1% capped at R17,712 ceiling = max R177.12).
 */
export function calculateUifEmployee(grossMonthly: number): number {
  if (grossMonthly <= 0) return 0;
  const taxable = Math.min(grossMonthly, SARS_2027_CONFIG.uif.monthlyCeiling);
  return Math.round(taxable * SARS_2027_CONFIG.uif.employeeRate * 100) / 100;
}

/**
 * Calculate employer UIF contribution (1% capped at R17,712 ceiling = max R177.12).
 */
export function calculateUifEmployer(grossMonthly: number): number {
  if (grossMonthly <= 0) return 0;
  const taxable = Math.min(grossMonthly, SARS_2027_CONFIG.uif.monthlyCeiling);
  return Math.round(taxable * SARS_2027_CONFIG.uif.employerRate * 100) / 100;
}

/**
 * Calculate Skills Development Levy (1% of monthly gross, paid by employer).
 * Exempt if company annual payroll <= R500,000.
 */
export function calculateSdl(grossMonthly: number, isCompanyExempt: boolean = false): number {
  if (grossMonthly <= 0 || isCompanyExempt) return 0;
  return Math.round(grossMonthly * SARS_2027_CONFIG.sdl.rate * 100) / 100;
}

/**
 * Calculate Employment Tax Incentive (ETI) for youth employment.
 * Applies for ages 18-29 earning between R2,000 and R7,500/month.
 */
export function calculateEti(grossMonthly: number, age: number): number {
  if (age < SARS_2027_CONFIG.eti.minAge || age > SARS_2027_CONFIG.eti.maxAge) {
    return 0;
  }
  if (grossMonthly < SARS_2027_CONFIG.eti.minSalary || grossMonthly > SARS_2027_CONFIG.eti.maxSalary) {
    return 0;
  }

  // First 12 months calculation formula under SARS ETI Act:
  // If R2000 - R4499: 75% of remuneration, max R1,500
  // If R4500 - R7500: R1500 - (0.5 * (grossMonthly - 4500))
  if (grossMonthly < 4500) {
    return Math.min(SARS_2027_CONFIG.eti.maxIncentive, Math.round(grossMonthly * 0.375 * 100) / 100);
  } else {
    const incentive = SARS_2027_CONFIG.eti.maxIncentive - 0.5 * (grossMonthly - 4500);
    return Math.max(0, Math.round(incentive * 100) / 100);
  }
}

/**
 * Full SARS monthly payroll breakdown for one employee.
 */
export function calculatePayroll(
  grossMonthly: number,
  age: number,
  isCompanySdlExempt: boolean = false
): TaxCalculationBreakdown {
  if (grossMonthly < 0) {
    throw new Error(`Gross monthly salary cannot be negative: ${grossMonthly}`);
  }
  if (age < 16 || age > 100) {
    throw new Error(`Age must be between 16 and 100 (BCEA requirements). Received: ${age}`);
  }

  const grossAnnual = Math.round(grossMonthly * 12 * 100) / 100;
  const payeResult = calculateAnnualPaye(grossAnnual, age);
  const monthlyPaye = Math.round((payeResult.taxAfterRebate / 12) * 100) / 100;

  const uifEmp = calculateUifEmployee(grossMonthly);
  const uifEmpr = calculateUifEmployer(grossMonthly);
  const sdl = calculateSdl(grossMonthly, isCompanySdlExempt);
  const eti = calculateEti(grossMonthly, age);

  // Take-home pay = gross - PAYE - employee UIF
  const netPay = Math.round((grossMonthly - monthlyPaye - uifEmp) * 100) / 100;
  // Total cost to employer = gross + employer UIF + SDL - ETI relief
  const totalEmployerCost = Math.round((grossMonthly + uifEmpr + sdl - eti) * 100) / 100;

  return {
    grossMonthly,
    grossAnnual,
    age,
    taxableIncomeAnnual: grossAnnual,
    annualPayeBeforeRebates: payeResult.taxBeforeRebate,
    primaryRebate: payeResult.rebates.primary,
    secondaryRebate: payeResult.rebates.secondary,
    tertiaryRebate: payeResult.rebates.tertiary,
    totalRebates: payeResult.rebates.total,
    annualPaye: payeResult.taxAfterRebate,
    monthlyPaye,
    uifEmployee: uifEmp,
    uifEmployer: uifEmpr,
    sdlAmount: sdl,
    etiAmount: eti,
    netPay,
    totalEmployerCost,
    taxBracketRate: payeResult.marginalRate,
    isBelowThreshold: payeResult.isBelowThreshold,
  };
}

/**
 * Validates South African 13-digit ID number using the Luhn checksum algorithm
 * Format: YYMMDD GSSS C A Z
 */
export function validateSouthAfricanId(idNumber: string): {
  isValid: boolean;
  birthDate?: string;
  age?: number;
  gender?: 'M' | 'F';
  isCitizen?: boolean;
  error?: string;
} {
  const cleaned = idNumber.replace(/\s+/g, '');
  if (!/^\d{13}$/.test(cleaned)) {
    return { isValid: false, error: 'SA ID must be exactly 13 digits.' };
  }

  // South African Department of Home Affairs (DHA) Checksum algorithm:
  // Step 1: Sum digits in odd positions (1st, 3rd, 5th, 7th, 9th, 11th - indices 0, 2, 4, 6, 8, 10)
  let sumOdd = 0;
  for (let i = 0; i < 11; i += 2) {
    sumOdd += parseInt(cleaned.charAt(i), 10);
  }

  // Step 2: Form number from even positions (2nd, 4th, 6th, 8th, 10th, 12th - indices 1, 3, 5, 7, 9, 11)
  let evenStr = '';
  for (let i = 1; i < 12; i += 2) {
    evenStr += cleaned.charAt(i);
  }
  const evenMultiplied = (parseInt(evenStr, 10) * 2).toString();
  let sumEven = 0;
  for (let i = 0; i < evenMultiplied.length; i++) {
    sumEven += parseInt(evenMultiplied.charAt(i), 10);
  }

  // Step 3: Total sum and calculate check digit
  const total = sumOdd + sumEven;
  const expectedCheckDigit = (10 - (total % 10)) % 10;
  const actualCheckDigit = parseInt(cleaned.charAt(12), 10);

  if (actualCheckDigit !== expectedCheckDigit) {
    return { isValid: false, error: 'Invalid SA ID checksum (DHA algorithm check failed).' };
  }

  const yy = parseInt(cleaned.slice(0, 2), 10);
  const mm = parseInt(cleaned.slice(2, 4), 10);
  const dd = parseInt(cleaned.slice(4, 6), 10);

  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) {
    return { isValid: false, error: 'Invalid birth date encoded in ID number.' };
  }

  const now = new Date();
  const currentYY = now.getFullYear() % 100;
  const century = yy > currentYY ? 1900 : 2000;
  const birthYear = century + yy;
  const birthDate = new Date(birthYear, mm - 1, dd);

  let age = now.getFullYear() - birthYear;
  const hasHadBirthdayThisYear =
    now.getMonth() > mm - 1 || (now.getMonth() === mm - 1 && now.getDate() >= dd);
  if (!hasHadBirthdayThisYear) {
    age -= 1;
  }

  if (age < 16 || age > 110) {
    return { isValid: false, error: `Calculated age (${age}) is outside valid working age (16-110).` };
  }

  // Gender: digits 6-9: 0000-4999 = Female, 5000-9999 = Male
  const genderDigits = parseInt(cleaned.slice(6, 10), 10);
  const gender: 'M' | 'F' = genderDigits >= 5000 ? 'M' : 'F';

  // Citizenship: digit 10: 0 = SA citizen, 1 = permanent resident
  const isCitizen = cleaned.charAt(10) === '0';

  const birthDateStr = `${birthYear}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;

  return {
    isValid: true,
    birthDate: birthDateStr,
    age,
    gender,
    isCitizen,
  };
}
