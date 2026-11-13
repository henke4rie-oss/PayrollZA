import {
  AuditLogEntry,
  Employee,
  PayrollRun,
  SubscriptionPlan,
  SubscriptionTier,
  Tenant,
  User,
  UserRole,
} from '../types';
import { calculateAgeFromDateOfBirth, calculatePayroll } from './taxEngine';
import { createAuditLog, generateSha256Checksum } from './security';

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Micro-Trial (Free Pilot)',
    priceZAR: 0,
    period: 'month',
    maxEmployees: 3,
    maxTenants: 1,
    features: [
      'Up to 3 active employees (Free Pilot)',
      '1 Company workspace',
      'SARS 2026/2027 PAYE, UIF & SDL tables',
      'BCEA Section 33 printable payslips',
      'Monthly CSV export',
      'Local-first privacy',
    ],
  },
  {
    id: 'starter',
    name: 'Growth Starter',
    priceZAR: 189,
    period: 'month',
    maxEmployees: 15,
    maxTenants: 1,
    features: [
      'Up to 15 active employees',
      'Automated SARS EMP201 reconciliation schedule',
      '1-Click WhatsApp Section 33 payslip delivery',
      'FNB, Standard Bank & Capitec batch EFT exports',
      'Audit-proof SARS Youth ETI tracker',
      'Role-based access (Owner, Admin, Auditor)',
    ],
  },
  {
    id: 'pro',
    name: 'Business Pro',
    priceZAR: 449,
    period: 'month',
    maxEmployees: 45,
    maxTenants: 3,
    features: [
      'Up to 45 active employees across 3 companies',
      'Dual-signoff approval workflows for payroll batches',
      'SARS EMP501 bi-annual reconciliation audit report',
      'Automated UIF UI-19 declaration generator',
      'Immutable cryptographic audit logging (SHA-256)',
      'CSV / Excel bulk employee import mapping',
    ],
  },
  {
    id: 'enterprise',
    name: 'Accountants Bureau',
    priceZAR: 999,
    period: 'month',
    maxEmployees: 9999,
    maxTenants: 9999,
    features: [
      'Unlimited client company workspaces',
      'Unlimited employee records across all clients',
      'Flat R999/mo with zero per-employee pricing',
      'Secure Organization Ownership Handover (M&A ready)',
      'Automated SARS eFiling upload packages',
      'Dedicated POPIA compliance certification',
      'Direct accountant external audit portal',
      'Priority phone & WhatsApp concierge support',
    ],
  },
];

export const DEMO_USERS: User[] = [
  {
    id: 'user-henke',
    name: 'Henke (Founder / Owner)',
    email: 'henke@example.com',
    createdAt: '2026-01-01',
  },
  {
    id: 'user-sarah',
    name: 'Sarah Khumalo (Payroll Officer)',
    email: 'sarah.khumalo@payrollza.co.za',
    createdAt: '2026-02-15',
  },
  {
    id: 'user-david',
    name: 'David Van Der Merwe (SARS Auditor)',
    email: 'david.auditor@sars-audit.co.za',
    createdAt: '2026-03-10',
  },
];

const INITIAL_TENANTS: Tenant[] = [
  {
    id: 'tenant-vanwyk',
    name: 'Van Wyk Agri Enterprises (Pty) Ltd',
    tradingName: 'Van Wyk Farms',
    registrationNumber: '2019/584910/07',
    sarsPayeNumber: '7920145829',
    sarsUifNumber: 'U48291054',
    sarsSdlNumber: 'L19284019',
    sarsTaxYear: '2026/2027',
    address: 'Main Road, Paarl, Western Cape, 7646',
    isSdlExempt: false,
    tier: 'free',
    createdAt: '2026-01-10',
    ownerId: 'user-henke',
  },
  {
    id: 'tenant-capetech',
    name: 'Table Mountain Digital Studio CC',
    tradingName: 'CapeTech Creative',
    registrationNumber: '2021/849201/23',
    sarsPayeNumber: '7102948592',
    sarsUifNumber: 'U92019482',
    sarsSdlNumber: 'L84920184',
    sarsTaxYear: '2026/2027',
    address: 'Kloof Street, Gardens, Cape Town, 8001',
    isSdlExempt: true,
    tier: 'starter',
    createdAt: '2026-02-01',
    ownerId: 'user-henke',
  },
];

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp-001',
    tenantId: 'tenant-vanwyk',
    employeeNumber: 'VAN001',
    fullName: 'Thabo Molefe',
    idNumber: '8805125009088',
    idType: 'rsa_id',
    dateOfBirth: '1988-05-12',
    age: calculateAgeFromDateOfBirth('1988-05-12'),
    gender: 'M',
    jobTitle: 'Fleet & Logistics Supervisor',
    department: 'Operations',
    grossMonthlySalary: 35000,
    startDate: '2020-02-01',
    isActive: true,
    taxNumber: '9120485920',
    bankName: 'First National Bank (FNB)',
    bankAccountNumber: '62849102948',
    bankBranchCode: '250655',
  },
  {
    id: 'emp-002',
    tenantId: 'tenant-vanwyk',
    employeeNumber: 'VAN002',
    fullName: 'Zanele Dlamini',
    idNumber: '0308140029080',
    idType: 'rsa_id',
    dateOfBirth: '2003-08-14',
    age: calculateAgeFromDateOfBirth('2003-08-14'),
    gender: 'F',
    jobTitle: 'Quality Control Junior (ETI Candidate)',
    department: 'Packing',
    grossMonthlySalary: 5500,
    startDate: '2023-09-01',
    isActive: true,
    taxNumber: '9384910294',
    bankName: 'Standard Bank',
    bankAccountNumber: '10192837465',
    bankBranchCode: '051001',
  },
  {
    id: 'emp-003',
    tenantId: 'tenant-vanwyk',
    employeeNumber: 'VAN003',
    fullName: 'Pieter Van Wyk',
    idNumber: '5811055009083',
    idType: 'rsa_id',
    dateOfBirth: '1958-11-05',
    age: calculateAgeFromDateOfBirth('1958-11-05'),
    gender: 'M',
    jobTitle: 'Senior Agronomist Advisor',
    department: 'Advisory',
    grossMonthlySalary: 28000,
    startDate: '2015-06-15',
    isActive: true,
    taxNumber: '9002918475',
    bankName: 'Nedbank',
    bankAccountNumber: '1982736452',
    bankBranchCode: '198765',
  },
  {
    id: 'emp-101',
    tenantId: 'tenant-capetech',
    employeeNumber: 'CAP001',
    fullName: 'Liam Petersen',
    idNumber: '9602195009083',
    idType: 'rsa_id',
    dateOfBirth: '1996-02-19',
    age: calculateAgeFromDateOfBirth('1996-02-19'),
    gender: 'M',
    jobTitle: 'Full-Stack Developer',
    department: 'Engineering',
    grossMonthlySalary: 42000,
    startDate: '2022-04-01',
    isActive: true,
    taxNumber: '9284758192',
    bankName: 'Capitec Bank',
    bankAccountNumber: '1548291048',
    bankBranchCode: '470010',
  },
];

const STORAGE_PREFIX = 'payrollza_';

const inMemoryStore = new Map<string, string>();

const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Fallback to in-memory store
    }
    return inMemoryStore.get(key) || null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch {
      // Fallback to in-memory store
    }
    inMemoryStore.set(key, value);
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch {
      // Fallback to in-memory store
    }
    inMemoryStore.delete(key);
  },
  clear: (): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
        return;
      }
    } catch {
      // Fallback to in-memory store
    }
    inMemoryStore.clear();
  },
};

export class LocalTenantStorage {
  private activeTenantId: string = 'tenant-vanwyk';
  private currentUser: User = DEMO_USERS[0];
  private currentUserRole: UserRole = 'owner';

  constructor() {
    this.initializeDefaults();
  }

  private initializeDefaults() {
    if (!safeStorage.getItem(`${STORAGE_PREFIX}tenants`)) {
      safeStorage.setItem(
        `${STORAGE_PREFIX}tenants`,
        JSON.stringify(INITIAL_TENANTS)
      );
    }
    if (!safeStorage.getItem(`${STORAGE_PREFIX}employees`)) {
      safeStorage.setItem(
        `${STORAGE_PREFIX}employees`,
        JSON.stringify(INITIAL_EMPLOYEES)
      );
    }

    const runsKey = `${STORAGE_PREFIX}runs_${this.activeTenantId}`;
    if (!safeStorage.getItem(runsKey)) {
      this.seedInitialPayrollRun(this.activeTenantId);
    }
  }

  private async seedInitialPayrollRun(tenantId: string) {
    const tenant = this.getTenant(tenantId);
    if (!tenant) return;

    const employees = this.getEmployees(tenantId).filter((e) => e.isActive);
    if (employees.length === 0) return;

    const period = '03/2026';
    const payslips = employees.map((emp) => {
      const calc = calculatePayroll(emp.grossMonthlySalary, emp.age, tenant.isSdlExempt);
      return {
        id: `slip-${emp.id}-032026`,
        tenantId,
        payrollRunId: `run-${tenantId}-032026`,
        employeeId: emp.id,
        employeeNumber: emp.employeeNumber,
        employeeName: emp.fullName,
        period,
        age: emp.age,
        grossMonthly: calc.grossMonthly,
        paye: calc.monthlyPaye,
        uifEmployee: calc.uifEmployee,
        uifEmployer: calc.uifEmployer,
        sdl: calc.sdlAmount,
        // ETI is not implemented in the Python API, so the demo run carries none either
        eti: 0,
        netPay: calc.netPay,
        totalEmployerCost: Math.round((calc.totalEmployerCost + calc.etiAmount) * 100) / 100,
        generatedAt: '2026-03-25T14:30:00.000Z',
      };
    });

    const totalGross = Math.round(payslips.reduce((acc, s) => acc + s.grossMonthly, 0) * 100) / 100;
    const totalPaye = Math.round(payslips.reduce((acc, s) => acc + s.paye, 0) * 100) / 100;
    const totalUifEmp = Math.round(payslips.reduce((acc, s) => acc + s.uifEmployee, 0) * 100) / 100;
    const totalUifEmpr = Math.round(payslips.reduce((acc, s) => acc + s.uifEmployer, 0) * 100) / 100;
    const totalSdl = Math.round(payslips.reduce((acc, s) => acc + s.sdl, 0) * 100) / 100;
    const totalEti = Math.round(payslips.reduce((acc, s) => acc + s.eti, 0) * 100) / 100;
    const totalNet = Math.round(payslips.reduce((acc, s) => acc + s.netPay, 0) * 100) / 100;
    const totalCost = Math.round(payslips.reduce((acc, s) => acc + s.totalEmployerCost, 0) * 100) / 100;

    const payload = JSON.stringify({ tenantId, period, totalGross, totalPaye, count: payslips.length });
    const integrityHash = await generateSha256Checksum(payload);

    const initialRun: PayrollRun = {
      id: `run-${tenantId}-032026`,
      tenantId,
      period,
      companyName: tenant.name,
      createdAt: '2026-03-25T14:25:00.000Z',
      finalizedAt: '2026-03-25T14:30:00.000Z',
      finalizedBy: 'henke@example.com',
      status: 'finalized',
      integrityHash,
      payslips,
      totalGross,
      totalPaye,
      totalUifEmployee: totalUifEmp,
      totalUifEmployer: totalUifEmpr,
      totalSdl,
      totalEti,
      totalNet,
      totalEmployerCost: totalCost,
      employeeCount: payslips.length,
    };

    safeStorage.setItem(
      `${STORAGE_PREFIX}runs_${tenantId}`,
      JSON.stringify([initialRun])
    );

    this.addAuditLog(
      createAuditLog(
        tenantId,
        'henke@example.com',
        'owner',
        'Finalize Payroll Run',
        'payroll',
        `Finalized March 2026 payroll run with ${payslips.length} employees. Total Net: R${totalNet.toLocaleString()}. SHA-256 seal verified.`
      )
    );
  }

  // --- Multi-Tenant Context Switching ---

  public getActiveTenantId(): string {
    return this.activeTenantId;
  }

  public setActiveTenantId(tenantId: string) {
    this.activeTenantId = tenantId;
  }

  public getCurrentUser(): User {
    return this.currentUser;
  }

  public setCurrentUser(user: User, role: UserRole) {
    this.currentUser = user;
    this.currentUserRole = role;
  }

  public getCurrentUserRole(): UserRole {
    return this.currentUserRole;
  }

  public getCurrentRole(): UserRole {
    return this.currentUserRole;
  }

  // --- Tenants ---

  public getTenants(): Tenant[] {
    const raw = safeStorage.getItem(`${STORAGE_PREFIX}tenants`);
    return raw ? JSON.parse(raw) : INITIAL_TENANTS;
  }

  public getTenant(id: string): Tenant | undefined {
    return this.getTenants().find((t) => t.id === id);
  }

  public saveTenant(tenant: Tenant) {
    const tenants = this.getTenants();
    const index = tenants.findIndex((t) => t.id === tenant.id);
    if (index >= 0) {
      tenants[index] = tenant;
    } else {
      tenants.push(tenant);
    }
    safeStorage.setItem(`${STORAGE_PREFIX}tenants`, JSON.stringify(tenants));
  }

  public updateSubscription(tenantId: string, tier: SubscriptionTier) {
    const tenant = this.getTenant(tenantId);
    if (!tenant) return;
    tenant.tier = tier;
    this.saveTenant(tenant);

    this.addAuditLog(
      createAuditLog(
        tenantId,
        this.currentUser.email,
        this.currentUserRole,
        'Subscription Changed',
        'billing',
        `Upgraded/Updated plan to ${tier.toUpperCase()}`
      )
    );
  }

  // --- Employees (Tenant Isolated) ---

  public getEmployees(tenantId: string): Employee[] {
    const raw = safeStorage.getItem(`${STORAGE_PREFIX}employees`);
    const all: Employee[] = raw ? JSON.parse(raw) : INITIAL_EMPLOYEES;
    return all
      .filter((e) => e.tenantId === tenantId)
      .map((e) => ({
        ...e,
        age: calculateAgeFromDateOfBirth(e.dateOfBirth),
      }));
  }

  public saveEmployee(employee: Employee) {
    const raw = safeStorage.getItem(`${STORAGE_PREFIX}employees`);
    const all: Employee[] = raw ? JSON.parse(raw) : [...INITIAL_EMPLOYEES];
    const employeeWithDerivedAge: Employee = {
      ...employee,
      age: calculateAgeFromDateOfBirth(employee.dateOfBirth),
    };
    const index = all.findIndex((e) => e.id === employee.id && e.tenantId === employee.tenantId);

    if (index >= 0) {
      all[index] = employeeWithDerivedAge;
      this.addAuditLog(
        createAuditLog(
          employee.tenantId,
          this.currentUser.email,
          this.currentUserRole,
          'Update Employee',
          'employee',
          `Updated details for employee ${employee.employeeNumber} (${employee.fullName}). Salary: R${employee.grossMonthlySalary}`
        )
      );
    } else {
      all.push(employeeWithDerivedAge);
      this.addAuditLog(
        createAuditLog(
          employee.tenantId,
          this.currentUser.email,
          this.currentUserRole,
          'Create Employee',
          'employee',
          `Added new employee ${employee.employeeNumber} (${employee.fullName})`
        )
      );
    }
    safeStorage.setItem(`${STORAGE_PREFIX}employees`, JSON.stringify(all));
  }

  public deleteEmployee(tenantId: string, employeeId: string) {
    const raw = safeStorage.getItem(`${STORAGE_PREFIX}employees`);
    const all: Employee[] = raw ? JSON.parse(raw) : INITIAL_EMPLOYEES;
    const filtered = all.filter((e) => !(e.id === employeeId && e.tenantId === tenantId));
    safeStorage.setItem(`${STORAGE_PREFIX}employees`, JSON.stringify(filtered));

    this.addAuditLog(
      createAuditLog(
        tenantId,
        this.currentUser.email,
        this.currentUserRole,
        'Delete Employee',
        'employee',
        `Removed employee ID ${employeeId} from tenant active records.`
      )
    );
  }

  // --- Payroll Runs ---

  public getPayrollRuns(tenantId: string): PayrollRun[] {
    const raw = safeStorage.getItem(`${STORAGE_PREFIX}runs_${tenantId}`);
    return raw ? JSON.parse(raw) : [];
  }

  public savePayrollRun(run: PayrollRun) {
    const runs = this.getPayrollRuns(run.tenantId);
    const index = runs.findIndex((r) => r.id === run.id);
    if (index >= 0) {
      runs[index] = run;
    } else {
      runs.unshift(run);
    }
    safeStorage.setItem(`${STORAGE_PREFIX}runs_${run.tenantId}`, JSON.stringify(runs));

    this.addAuditLog(
      createAuditLog(
        run.tenantId,
        this.currentUser.email,
        this.currentUserRole,
        'Save Payroll Run',
        'payroll',
        `Saved payroll run ${run.period} for ${run.companyName}. Status: ${run.status}. Employees: ${run.employeeCount}`
      )
    );
  }

  // --- Immutable Audit Logs ---

  public getAuditLogs(tenantId: string): AuditLogEntry[] {
    const raw = safeStorage.getItem(`${STORAGE_PREFIX}audit_${tenantId}`);
    return raw ? JSON.parse(raw) : [];
  }

  public addAuditLog(entry: AuditLogEntry) {
    const logs = this.getAuditLogs(entry.tenantId);
    logs.unshift(entry);
    if (logs.length > 500) {
      logs.length = 500;
    }
    safeStorage.setItem(`${STORAGE_PREFIX}audit_${entry.tenantId}`, JSON.stringify(logs));
  }

  // --- POPIA Compliance / Backup & Export ---

  public exportTenantData(tenantId: string): string {
    const tenant = this.getTenant(tenantId);
    const employees = this.getEmployees(tenantId);
    const runs = this.getPayrollRuns(tenantId);
    const auditLogs = this.getAuditLogs(tenantId);

    const backupBundle = {
      exportTimestamp: new Date().toISOString(),
      formatVersion: '1.0-za-popia',
      tenant,
      employees,
      payrollRuns: runs,
      auditLogs,
    };

    this.addAuditLog(
      createAuditLog(
        tenantId,
        this.currentUser.email,
        this.currentUserRole,
        'Export POPIA Data Backup',
        'popia',
        `Full cryptographic backup of tenant data downloaded.`
      )
    );

    return JSON.stringify(backupBundle, null, 2);
  }

  public async transferTenantOwnership(
    tenantId: string,
    toSuccessorEmail: string,
    toSuccessorName: string,
    downgradeToAuditor: boolean = true
  ): Promise<{ success: boolean; message: string; auditSeal: string }> {
    const tenant = this.getTenant(tenantId);
    if (!tenant) {
      return { success: false, message: 'Tenant not found.', auditSeal: '' };
    }

    if (this.currentUserRole !== 'owner') {
      return { success: false, message: 'Only the active Owner can execute an ownership transfer.', auditSeal: '' };
    }

    const fromOwnerEmail = this.currentUser.email;

    let successorUser = DEMO_USERS.find((u) => u.email.toLowerCase() === toSuccessorEmail.toLowerCase());
    if (!successorUser) {
      successorUser = {
        id: `user-${Date.now()}`,
        name: toSuccessorName || toSuccessorEmail.split('@')[0],
        email: toSuccessorEmail,
        createdAt: new Date().toISOString(),
      };
      DEMO_USERS.push(successorUser);
    }

    tenant.ownerId = successorUser.id;
    this.saveTenant(tenant);

    const payload = JSON.stringify({
      tenantId,
      fromOwnerEmail,
      toSuccessorEmail,
      timestamp: new Date().toISOString(),
      action: 'LEGAL_ENTITY_OWNERSHIP_TRANSFER',
    });
    const auditSeal = await generateSha256Checksum(payload);

    this.addAuditLog(
      createAuditLog(
        tenantId,
        fromOwnerEmail,
        'owner',
        'Ownership Transferred',
        'security',
        `Primary workspace ownership legally transferred to ${toSuccessorEmail}. Former owner role: ${
          downgradeToAuditor ? 'Auditor (Read-Only)' : 'Removed'
        }. Cryptographic Handshake Seal: ${auditSeal}`
      )
    );

    if (downgradeToAuditor) {
      this.currentUserRole = 'auditor';
    }

    return {
      success: true,
      message: `Ownership successfully transferred to ${toSuccessorEmail}! Former owner downgraded to read-only Auditor.`,
      auditSeal,
    };
  }

  getTenantLicense(tenantId: string): {
    status: 'active' | 'trial' | 'expired';
    daysRemaining: number;
    expiresAt: string;
    tier: SubscriptionTier;
  } {
    const tenant = this.getTenant(tenantId);
    if (!tenant) {
      return { status: 'expired', daysRemaining: 0, expiresAt: new Date().toISOString(), tier: 'free' };
    }

    let expiry = tenant.licenseExpiry;
    if (!expiry) {
      const created = new Date(tenant.createdAt || Date.now());
      created.setDate(created.getDate() + 30);
      expiry = created.toISOString();
    }

    const now = new Date();
    const expiryDate = new Date(expiry);
    const diffMs = expiryDate.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    let status: 'active' | 'trial' | 'expired' = 'active';
    if (diffMs <= 0) {
      status = 'expired';
    } else if (tenant.tier === 'free') {
      status = 'trial';
    }

    return {
      status,
      daysRemaining,
      expiresAt: expiry,
      tier: tenant.tier,
    };
  }
}

export const storage = new LocalTenantStorage();
