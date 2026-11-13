/*
PayrollZA front end.
A React client for the Python (FastAPI) payroll API in /api.
Payroll calculation and SA ID validation run on the API. Employee and payroll-run
data is kept in the browser (localStorage) for this demo.
*/

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { PayrollRunView } from './components/PayrollRunView';
import { EmployeesView } from './components/EmployeesView';
import { SarsComplianceView } from './components/SarsComplianceView';
import { PayslipModal } from './components/PayslipModal';
import { Employee, PayrollRun, Payslip, Tenant } from './types';
import { storage } from './utils/storage';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Single demo company (workspace) loaded from local storage
  const [tenant] = useState<Tenant>(() => {
    const all = storage.getTenants();
    return all.find((t) => t.id === storage.getActiveTenantId()) || all[0];
  });
  const currentUserRole = storage.getCurrentUserRole();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);

  useEffect(() => {
    setEmployees(storage.getEmployees(tenant.id));
    setPayrollRuns(storage.getPayrollRuns(tenant.id));
  }, [tenant.id]);

  const handleSaveEmployee = (emp: Employee) => {
    storage.saveEmployee(emp);
    setEmployees(storage.getEmployees(tenant.id));
  };

  const handleDeleteEmployee = (empId: string) => {
    storage.deleteEmployee(tenant.id, empId);
    setEmployees(storage.getEmployees(tenant.id));
  };

  const handleSavePayrollRun = (run: PayrollRun) => {
    storage.savePayrollRun(run);
    setPayrollRuns(storage.getPayrollRuns(tenant.id));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            tenant={tenant}
            employees={employees}
            payrollRuns={payrollRuns}
            currentUserRole={currentUserRole}
            onNavigateTab={setActiveTab}
            onViewPayslip={setSelectedPayslip}
          />
        )}

        {activeTab === 'payroll' && (
          <PayrollRunView
            tenant={tenant}
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
            tenant={tenant}
            employees={employees}
            currentUserRole={currentUserRole}
            onSaveEmployee={handleSaveEmployee}
            onDeleteEmployee={handleDeleteEmployee}
          />
        )}

        {activeTab === 'sars' && (
          <SarsComplianceView tenant={tenant} employees={employees} payrollRuns={payrollRuns} />
        )}
      </main>

      <footer className="border-t border-slate-800 bg-slate-900/50 py-4 px-4 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
          <span className="font-bold text-slate-200">PayrollZA</span>
          <span className="text-slate-600">•</span>
          <span>Portfolio project: React front end + Python/FastAPI backend</span>
        </div>
      </footer>

      {selectedPayslip && (
        <PayslipModal payslip={selectedPayslip} tenant={tenant} onClose={() => setSelectedPayslip(null)} />
      )}
    </div>
  );
}
