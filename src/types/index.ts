export type UserRole = 'owner' | 'admin' | 'payroll_officer' | 'auditor' | 'employee';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface TenantMembership {
  tenantId: string;
  userId: string;
  role: UserRole;
  joinedAt: string;
}

export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'enterprise';

export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  priceZAR: number;
  period: 'month';
  maxEmployees: number;
  maxTenants: number;
  features: string[];
  popular?: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  tradingName?: string;
  registrationNumber?: string;
  sarsPayeNumber?: string;
  sarsUifNumber?: string;
  sarsSdlNumber?: string;
  sarsTaxYear: string;
  address: string;
  isSdlExempt: boolean; // Payroll under R500k/year
  tier: SubscriptionTier;
  createdAt: string;
  ownerId: string;
  licenseExpiry?: string; // ISO date string when pilot/license expires
  activeLicenseCode?: string; // Currently applied license key
}

export interface Employee {
  id: string;
  tenantId: string;
  employeeNumber: string;
  fullName: string;
  idNumber: string; // 13-digit RSA ID or passport
  idType: 'rsa_id' | 'passport';
  dateOfBirth: string;
  age: number;
  gender?: 'M' | 'F' | 'Other';
  jobTitle: string;
  department: string;
  grossMonthlySalary: number;
  startDate: string;
  isActive: boolean;
  taxNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankBranchCode?: string;
  medicalAidMembers?: number;
  pensionFundPercentage?: number;
}

export interface TaxCalculationBreakdown {
  grossMonthly: number;
  grossAnnual: number;
  age: number;
  taxableIncomeAnnual: number;
  annualPayeBeforeRebates: number;
  primaryRebate: number;
  secondaryRebate: number;
  tertiaryRebate: number;
  totalRebates: number;
  annualPaye: number;
  monthlyPaye: number;
  uifEmployee: number;
  uifEmployer: number;
  sdlAmount: number;
  etiAmount: number; // Employment Tax Incentive
  netPay: number;
  totalEmployerCost: number;
  taxBracketRate: number;
  isBelowThreshold: boolean;
}

export interface Payslip {
  id: string;
  tenantId: string;
  payrollRunId: string;
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  period: string; // MM/YYYY
  age: number;
  grossMonthly: number;
  paye: number;
  uifEmployee: number;
  uifEmployer: number;
  sdl: number;
  eti: number;
  netPay: number;
  totalEmployerCost: number;
  generatedAt: string;
}

export interface PayrollRun {
  id: string;
  tenantId: string;
  period: string; // MM/YYYY
  companyName: string;
  createdAt: string;
  finalizedAt?: string;
  status: 'draft' | 'finalized';
  finalizedBy?: string;
  integrityHash?: string; // SHA-256 of all payslips for tamper detection
  payslips: Payslip[];
  totalGross: number;
  totalPaye: number;
  totalUifEmployee: number;
  totalUifEmployer: number;
  totalSdl: number;
  totalEti: number;
  totalNet: number;
  totalEmployerCost: number;
  employeeCount: number;
}

export interface AuditLogEntry {
  id: string;
  tenantId: string;
  timestamp: string;
  actorEmail: string;
  actorRole: UserRole;
  action: string;
  category: 'payroll' | 'employee' | 'security' | 'popia' | 'billing';
  details: string;
  ipAddress?: string;
  securityFlag?: 'normal' | 'sensitive' | 'blocked_idor';
}

export interface Emp201Declaration {
  tenantId: string;
  companyName: string;
  payeNumber: string;
  period: string; // e.g. 202604
  totalPaye: number;
  totalSdl: number;
  totalUif: number; // 2% (employee + employer)
  totalEtiBroughtForward: number;
  totalEtiCalculated: number;
  totalEtiUtilised: number;
  netEtiCarriedForward: number;
  totalLiability: number;
  status: 'draft' | 'submitted';
  preparedDate: string;
}

export interface Irp5Certificate {
  certificateNumber: string;
  taxYear: string;
  employeeId: string;
  employeeName: string;
  idNumber: string;
  taxNumber: string;
  remunerationCode3601: number; // Normal income
  payeCode4102: number; // PAYE deducted
  uifCode4141: number; // UIF deducted
  sdlCode4142: number; // SDL
  etiCode4118: number; // ETI claimed
  periodFrom: string;
  periodTo: string;
}

export interface Ui19Submission {
  tenantId: string;
  uifReferenceNumber: string;
  period: string; // e.g. 03/2026
  employerName: string;
  payeNumber: string;
  totalEmployees: number;
  totalGrossRemuneration: number;
  totalUifContribution: number; // 2%
  submissionDate: string;
  records: {
    idNumber: string;
    fullName: string;
    dateEmployed: string;
    status: 'active' | 'terminated' | 'maternity' | 'illness';
    grossRemuneration: number;
    hoursWorked: number;
    uifContribution: number;
  }[];
}

export interface CoidaReturn {
  tenantId: string;
  compensationRef: string;
  assessmentYear: string; // e.g. 2026
  employerName: string;
  totalEarningsActual: number;
  totalEarningsCapped: number; // Capped at R568,959/person/year
  provisionalEarningsNextYear: number;
  estimatedAssessmentRate: number; // Typically ~1.1% to 1.8% based on risk category
  estimatedLevyPayable: number;
  employeeCount: number;
  declarationDate: string;
}

export interface Emp501Reconciliation {
  tenantId: string;
  reconciliationType: 'interim' | 'annual';
  taxYear: string;
  reconciliationPeriod: string; // 'March - August' or 'March - February'
  payeDeclared: number;
  sdlDeclared: number;
  uifDeclared: number;
  etiClaimed: number;
  totalLiability: number;
  payePaid: number;
  sdlPaid: number;
  uifPaid: number;
  totalPayments: number;
  variance: number; // Difference between declared and paid
  irp5Count: number;
  irp5TotalPaye: number;
  irp5Variance: number; // Variance between certificate tax and declared tax
  isBalanced: boolean;
}

export interface OwnershipTransferRecord {
  id: string;
  tenantId: string;
  fromOwnerEmail: string;
  toSuccessorEmail: string;
  requestedAt: string;
  completedAt?: string;
  status: 'pending' | 'completed' | 'cancelled';
  verificationCodeHash: string;
  legalEntityConsent: boolean; // Confirms TAA s29 records handover
  retainedAuditorRole: boolean; // Former owner downgraded to auditor
  auditSeal: string;
}

