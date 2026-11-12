/*
"""
PayrollZA — South African Multi-Tenant Payroll & Tax Compliance SaaS
Root Application Component
Manages:
- Active Tenant State & Seamless Workspace Switching
- Role-Based Access Control (Owner, Admin, Payroll Officer, Auditor)
- Tab Navigation (Dashboard, Payroll Run, Employees & Import, SARS Compliance, Security & POPIA, Subscription Billing)
- BCEA Section 33 Compliant Printable Payslip Viewer Modal
- Founder's $0 Free Hosting Architecture Guide Modal
"""
*/

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { PayrollRunView } from './components/PayrollRunView';
import { EmployeesView } from './components/EmployeesView';
import { SarsComplianceView } from './components/SarsComplianceView';
import { SecurityComplianceView } from './components/SecurityComplianceView';
import { SubscriptionBillingView } from './components/SubscriptionBillingView';
import { PayslipModal } from './components/PayslipModal';
import { LandingPageView } from './components/LandingPageView';
import { Employee, PayrollRun, Payslip, SubscriptionTier, Tenant, User, UserRole } from './types';
import { storage } from './utils/storage';

export default function App() {
  // # Active navigation tab & View Mode (landing portal vs applet workOS)
  const [viewMode, setViewMode] = useState<'app' | 'landing'>('app');
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // # Multi-Tenant State
  const [tenants, setTenants] = useState<Tenant[]>(storage.getTenants());
  const [activeTenantId, setActiveTenantId] = useState<string>(storage.getActiveTenantId());
  const activeTenant = tenants.find((t) => t.id === activeTenantId) || tenants[0];

  // # User Authentication & RBAC Simulation State
  const [currentUser, setCurrentUser] = useState<User>(storage.getCurrentUser());
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(storage.getCurrentUserRole());

  // # Tenant Data (Strictly isolated by activeTenant.id)
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [auditLogs, setAuditLogs] = useState(storage.getAuditLogs(activeTenant.id));

  // # Modals
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);

  // # Reload data whenever active tenant changes
  useEffect(() => {
    if (activeTenant) {
      setEmployees(storage.getEmployees(activeTenant.id));
      setPayrollRuns(storage.getPayrollRuns(activeTenant.id));
      setAuditLogs(storage.getAuditLogs(activeTenant.id));
    }
  }, [activeTenantId, activeTenant]);

  // Tenant Switching Handler
  const handleSelectTenant = (tenantId: string) => {
    storage.setActiveTenantId(tenantId);
    setActiveTenantId(tenantId);
  };

  // # Handle Employee Save & Update
  const handleSaveEmployee = (emp: Employee) => {
    storage.saveEmployee(emp);
    setEmployees(storage.getEmployees(activeTenant.id));
    setAuditLogs(storage.getAuditLogs(activeTenant.id));
  };

  // # Handle Employee Deletion
  const handleDeleteEmployee = (empId: string) => {
    storage.deleteEmployee(activeTenant.id, empId);
    setEmployees(storage.getEmployees(activeTenant.id));
    setAuditLogs(storage.getAuditLogs(activeTenant.id));
  };

  // # Handle Payroll Run Save (Draft or Finalized)
  const handleSavePayrollRun = (run: PayrollRun) => {
    storage.savePayrollRun(run);
    setPayrollRuns(storage.getPayrollRuns(activeTenant.id));
    setAuditLogs(storage.getAuditLogs(activeTenant.id));
  };

  // # Handle Subscription Plan Upgrade
  const handleUpgradePlan = (tier: SubscriptionTier) => {
    storage.updateSubscription(activeTenant.id, tier);
    setTenants(storage.getTenants());
    setAuditLogs(storage.getAuditLogs(activeTenant.id));
  };

  // # Handle Switching User Role (Owner, Payroll Officer, Auditor)
  const handleChangeUserRole = (user: User, role: UserRole) => {
    storage.setCurrentUser(user, role);
    setCurrentUser(user);
    setCurrentUserRole(role);
  };

  const license = storage.getTenantLicense(activeTenant.id);

  if (viewMode === 'landing') {
    return (
      <LandingPageView
        onLaunchApp={() => setViewMode('app')}
        activeTenant={activeTenant}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Header & Tenant Switcher */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tenants={tenants}
        activeTenant={activeTenant}
        onSelectTenant={handleSelectTenant}
        currentUser={currentUser}
        currentUserRole={currentUserRole}
        onChangeUserRole={handleChangeUserRole}
        onOpenLandingPage={() => setViewMode('landing')}
      />

      {/* Concierge License Expiry / Pilot Notice Banner */}
      {license.status === 'expired' && (
        <div className="bg-amber-950/80 border-b border-amber-600/50 px-4 py-2 text-xs text-amber-200">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 flex-wrap">
            <span className="font-semibold">
              Notice: Your 30-day pilot for {activeTenant.name} has concluded. Please contact Henke (access@4mula.co.za) for your renewal code.
            </span>
            <button
              onClick={() => setActiveTab('billing')}
              className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] transition-colors"
            >
              Enter License Code
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            tenant={activeTenant}
            employees={employees}
            payrollRuns={payrollRuns}
            currentUserRole={currentUserRole}
            onNavigateTab={setActiveTab}
            onViewPayslip={setSelectedPayslip}
          />
        )}

        {activeTab === 'payroll' && (
          <PayrollRunView
            tenant={activeTenant}
            employees={employees}
            existingRuns={payrollRuns}
            currentUserRole={currentUserRole}
            onSaveRun={handleSavePayrollRun}
            onViewPayslip={setSelectedPayslip}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'employees' && (
          <EmployeesView
            tenant={activeTenant}
            employees={employees}
            currentUserRole={currentUserRole}
            onSaveEmployee={handleSaveEmployee}
            onDeleteEmployee={handleDeleteEmployee}
          />
        )}

        {activeTab === 'sars' && (
          <SarsComplianceView
            tenant={activeTenant}
            employees={employees}
            payrollRuns={payrollRuns}
          />
        )}

        {activeTab === 'security' && (
          <SecurityComplianceView
            tenant={activeTenant}
            payrollRuns={payrollRuns}
            auditLogs={auditLogs}
            currentUserRole={currentUserRole}
          />
        )}

        {activeTab === 'billing' && (
          <SubscriptionBillingView
            tenant={activeTenant}
            currentUserRole={currentUserRole}
            employeeCount={employees.filter((e) => e.isActive).length}
            onUpgradePlan={handleUpgradePlan}
          />
        )}
      </main>

      {/* Footer with South African Statutory Compliance Badges */}
      <footer className="border-t border-slate-800 bg-slate-900/50 py-4 px-4 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-200">4mula WorkOS</span>
            <span className="text-slate-500">•</span>
            <span>SARS 2026/2027 Tax Engine</span>
            <span className="text-slate-500">•</span>
            <span>UICA No. 4 of 2002</span>
            <span className="text-slate-500">•</span>
            <span>BCEA Act 75 of 1997</span>
          </div>

          <div className="flex items-center gap-3 text-slate-400">
            <span className="text-slate-300 font-medium">POPIA Section 19 Protected</span>
            <span className="text-slate-600">|</span>
            <span>TAA s29 5-Year Data Retention</span>
            <span className="text-slate-600">|</span>
            <span className="font-mono text-emerald-400">SHA-256 Tamper-Sealed</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {selectedPayslip && (
        <PayslipModal
          payslip={selectedPayslip}
          tenant={activeTenant}
          onClose={() => setSelectedPayslip(null)}
        />
      )}
    </div>
  );
}
