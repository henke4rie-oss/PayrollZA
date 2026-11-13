/*
"""
Payroll Run & Calculation Engine View
Calculates monthly payroll batch for all active employees:
- SARS 2026/2027 progressive PAYE tax brackets
- UIF contributions with statutory R17,712 monthly ceiling
- SDL calculations (with R500k employer exemption support)
- ETI (Employment Tax Incentive) youth incentive
- Cryptographic SHA-256 seal for tamper evidence (TAA Section 29)
- One-click CSV export matching csv_exporter_4ab3bfeb.py
"""
*/

import React, { useState } from 'react';
import {
  Calculator,
  Download,
  ShieldCheck,
  CheckCircle2,
  FileText,
  AlertCircle,
  Play,
  RotateCcw,
  Sparkles,
  Landmark,
  MessageCircle,
  RefreshCw,
} from 'lucide-react';
import { Employee, PayrollRun, Payslip, Tenant, UserRole } from '../types';
import { calculatePayrollApi } from '../utils/api';
import { generateSha256Checksum, hasPermission } from '../utils/security';
import { exportPayrollToCsv, downloadFile } from '../utils/sarsReports';
import { BankBatchExportModal } from './BankBatchExportModal';

interface PayrollRunViewProps {
  tenant: Tenant;
  employees: Employee[];
  existingRuns: PayrollRun[];
  currentUserRole: UserRole;
  onSaveRun: (run: PayrollRun) => void;
  onViewPayslip: (slip: Payslip) => void;
  onNavigateTab: (tab: string) => void;
}

export const PayrollRunView: React.FC<PayrollRunViewProps> = ({
  tenant,
  employees,
  existingRuns,
  currentUserRole,
  onSaveRun,
  onViewPayslip,
  onNavigateTab,
}) => {
  const [period, setPeriod] = useState<string>('04/2026');
  const [activeRun, setActiveRun] = useState<PayrollRun | null>(existingRuns[0] || null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [showBankBatchModal, setShowBankBatchModal] = useState<boolean>(false);

  const activeEmployees = employees.filter((e) => e.isActive);
  const canRun = hasPermission(currentUserRole, 'canRunPayroll');

  const getWhatsappUrl = (slip: Payslip) => {
    const text = `Hi ${slip.employeeName}, your official payslip for period ${slip.period} from ${tenant.name} is ready. Gross: R${slip.grossMonthly.toLocaleString(undefined, { minimumFractionDigits: 2 })} | Net Take-Home: R${slip.netPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}. (BCEA Section 33 Compliant).`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  const handleExecutePayroll = async () => {
    if (!canRun) {
      setNotification('Permission Denied: Your current role (Auditor / Employee) is read-only.');
      return;
    }
    if (activeEmployees.length === 0) {
      setNotification('No active employees found in this workspace. Please add or import employees first.');
      return;
    }

    setIsCalculating(true);

    try {
      // All maths happens in the Python API: one request per employee, sent in parallel.
      const calcs = await Promise.all(
        activeEmployees.map((emp) => calculatePayrollApi(emp.grossMonthlySalary, emp.age, tenant.isSdlExempt)),
      );
      const generatedPayslips: Payslip[] = activeEmployees.map((emp, i) => {
        const calc = calcs[i];
        return {
          id: `slip-${emp.id}-${period.replace('/', '')}-${Date.now()}`,
          tenantId: tenant.id,
          payrollRunId: `run-${tenant.id}-${period.replace('/', '')}`,
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
          eti: calc.etiAmount,
          netPay: calc.netPay,
          totalEmployerCost: calc.totalEmployerCost,
          generatedAt: new Date().toISOString(),
        };
      });

      const totalGross = Math.round(generatedPayslips.reduce((acc, s) => acc + s.grossMonthly, 0) * 100) / 100;
      const totalPaye = Math.round(generatedPayslips.reduce((acc, s) => acc + s.paye, 0) * 100) / 100;
      const totalUifEmp = Math.round(generatedPayslips.reduce((acc, s) => acc + s.uifEmployee, 0) * 100) / 100;
      const totalUifEmpr = Math.round(generatedPayslips.reduce((acc, s) => acc + s.uifEmployer, 0) * 100) / 100;
      const totalSdl = Math.round(generatedPayslips.reduce((acc, s) => acc + s.sdl, 0) * 100) / 100;
      const totalEti = Math.round(generatedPayslips.reduce((acc, s) => acc + s.eti, 0) * 100) / 100;
      const totalNet = Math.round(generatedPayslips.reduce((acc, s) => acc + s.netPay, 0) * 100) / 100;
      const totalCost = Math.round(generatedPayslips.reduce((acc, s) => acc + s.totalEmployerCost, 0) * 100) / 100;

      const newRun: PayrollRun = {
        id: `run-${tenant.id}-${period.replace('/', '')}`,
        tenantId: tenant.id,
        period,
        companyName: tenant.name,
        createdAt: new Date().toISOString(),
        status: 'draft',
        payslips: generatedPayslips,
        totalGross,
        totalPaye,
        totalUifEmployee: totalUifEmp,
        totalUifEmployer: totalUifEmpr,
        totalSdl,
        totalEti,
        totalNet,
        totalEmployerCost: totalCost,
        employeeCount: generatedPayslips.length,
      };

      setActiveRun(newRun);
      setIsCalculating(false);
      setNotification(`Calculated payroll for ${generatedPayslips.length} employees (Period: ${period}). Review below before sealing.`);
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      // API down or rejected the request: show why instead of failing silently
      setIsCalculating(false);
      setNotification(err instanceof Error ? err.message : 'Payroll calculation failed.');
    }
  };

  const handleFinalizeRun = async () => {
    if (!activeRun) return;
    setIsFinalizing(true);

    const payload = JSON.stringify({
      tenantId: activeRun.tenantId,
      period: activeRun.period,
      totalGross: activeRun.totalGross,
      totalPaye: activeRun.totalPaye,
      totalNet: activeRun.totalNet,
      employeeCount: activeRun.employeeCount,
      timestamp: new Date().toISOString(),
    });

    const integrityHash = await generateSha256Checksum(payload);

    const finalizedRun: PayrollRun = {
      ...activeRun,
      status: 'finalized',
      finalizedAt: new Date().toISOString(),
      finalizedBy: 'Current User',
      integrityHash,
    };

    setActiveRun(finalizedRun);
    onSaveRun(finalizedRun);
    setIsFinalizing(false);
    setNotification('Payroll run sealed and saved successfully! SHA-256 seal is now verifiable.');
    setTimeout(() => setNotification(null), 6000);
  };

  const handleExportCsv = () => {
    if (!activeRun) return;
    const csvContent = exportPayrollToCsv(activeRun);
    const safeName = activeRun.companyName.replace(/[^a-zA-Z0-9]/g, '_');
    const safePeriod = activeRun.period.replace('/', '-');
    downloadFile(`Payroll_${safeName}_${safePeriod}.csv`, csvContent);
  };

  return (
    <div className="space-y-6">
      {/* Control Bar: Pay Period Picker + Run Payroll CTA */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-400" />
              <span>Payroll Calculation Engine</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              SARS 2026/2027 PAYE tables, statutory UIF ceiling, SDL, and BCEA compliance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Pay Period Input */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5">
              <label htmlFor="pay-period" className="text-xs text-slate-400 font-medium">Pay Period:</label>
              <input
                id="pay-period"
                type="text"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="MM/YYYY"
                className="w-24 bg-transparent font-mono text-sm font-bold text-emerald-400 focus:outline-none"
              />
            </div>

            {/* Quick Period Buttons */}
            <button
              onClick={() => setPeriod('04/2026')}
              className="text-xs font-mono px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
            >
              04/2026
            </button>
            <button
              onClick={() => setPeriod('05/2026')}
              className="text-xs font-mono px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
            >
              05/2026
            </button>

            {/* Execute Calculation Button */}
            <button
              onClick={handleExecutePayroll}
              disabled={isCalculating}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md transition-colors disabled:opacity-50"
            >
              {isCalculating ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>{isCalculating ? 'Calculating Taxes...' : 'Run Payroll Calculation'}</span>
            </button>
          </div>
        </div>

        {/* Status notification */}
        {notification && (
          <div className="mt-4 p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-lg text-xs text-emerald-300 flex items-center justify-between animate-fadeIn">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{notification}</span>
            </span>
            <button onClick={() => setNotification(null)} className="text-emerald-400 hover:text-white">✕</button>
          </div>
        )}
      </div>

      {/* Financial Summary Bar (If Run Calculated) */}
      {activeRun && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payroll Summary:</span>
              <span className="text-sm font-bold text-white">{activeRun.period}</span>
              <span className="text-slate-500">•</span>
              <span className="text-xs text-slate-300">{activeRun.employeeCount} Employees</span>
              {activeRun.status === 'finalized' ? (
                <span className="text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Finalized &amp; Sealed</span>
                </span>
              ) : (
                <span className="text-[11px] font-semibold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                  Draft Preview
                </span>
              )}
            </div>

            {/* Finalize / Export Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {activeRun.status === 'draft' && (
                <button
                  onClick={handleFinalizeRun}
                  disabled={isFinalizing}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{isFinalizing ? 'Sealing...' : 'Seal with SHA-256'}</span>
                </button>
              )}
              {/* Bank Batch EFT Button */}
              <button
                onClick={() => setShowBankBatchModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-md shadow-sm transition-colors"
              >
                <Landmark className="w-3.5 h-3.5" />
                <span>Bank Batch (EFT)</span>
              </button>
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-md transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => onNavigateTab('sars')}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-semibold rounded-md hover:bg-emerald-900 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>SARS EMP201</span>
              </button>
            </div>
          </div>

          {/* 7-Metric Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Gross</span>
              <span className="text-base font-bold text-white mt-0.5 block font-mono">
                R{activeRun.totalGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">PAYE Tax</span>
              <span className="text-base font-bold text-indigo-400 mt-0.5 block font-mono">
                R{activeRun.totalPaye.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">UIF (Employee)</span>
              <span className="text-base font-bold text-slate-300 mt-0.5 block font-mono">
                R{activeRun.totalUifEmployee.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">UIF (Employer)</span>
              <span className="text-base font-bold text-slate-300 mt-0.5 block font-mono">
                R{activeRun.totalUifEmployer.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">SDL Levy</span>
              <span className="text-base font-bold text-slate-300 mt-0.5 block font-mono">
                R{activeRun.totalSdl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Net Pay</span>
              <span className="text-base font-bold text-emerald-400 mt-0.5 block font-mono">
                R{activeRun.totalNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Employer Cost</span>
              <span className="text-base font-bold text-amber-300 mt-0.5 block font-mono">
                R{activeRun.totalEmployerCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Cryptographic Hash Badge if Finalized */}
          {activeRun.integrityHash && (
            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-400 font-medium">TAA s29 Cryptographic SHA-256 Seal:</span>
              </div>
              <span className="font-mono text-[11px] text-emerald-400 truncate max-w-md bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {activeRun.integrityHash}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Payslips Table */}
      {activeRun && activeRun.payslips.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white">Employee Payslip Breakdown</h2>
            <span className="text-xs text-slate-400">{activeRun.payslips.length} items calculated</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <th className="pb-3">Code</th>
                  <th className="pb-3">Employee Name</th>
                  <th className="pb-3">Age</th>
                  <th className="pb-3">Gross Salary</th>
                  <th className="pb-3">PAYE Tax</th>
                  <th className="pb-3">UIF (1%)</th>
                  <th className="pb-3">SDL (1%)</th>
                  <th className="pb-3">Net Pay</th>
                  <th className="pb-3">Total Cost</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {activeRun.payslips.map((slip) => (
                  <tr key={slip.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 font-semibold text-slate-300 font-sans">{slip.employeeNumber}</td>
                    <td className="py-3 font-medium text-white font-sans">{slip.employeeName}</td>
                    <td className="py-3 text-slate-400">{slip.age}</td>
                    <td className="py-3 text-slate-200">R{slip.grossMonthly.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 text-indigo-400 font-semibold">R{slip.paye.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 text-slate-300">R{slip.uifEmployee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 text-slate-400">R{slip.sdl.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 font-bold text-emerald-400">R{slip.netPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 text-slate-300">R{slip.totalEmployerCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 text-right font-sans">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={getWhatsappUrl(slip)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-emerald-950/80 border border-emerald-700/60 hover:bg-emerald-900 text-emerald-300 rounded text-[11px] font-semibold transition-colors flex items-center gap-1"
                          title="Share Payslip Notification via WhatsApp"
                        >
                          <MessageCircle className="w-3 h-3 text-emerald-400" />
                          <span>WhatsApp</span>
                        </a>
                        <button
                          onClick={() => onViewPayslip(slip)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[11px] font-semibold transition-colors"
                        >
                          Print
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bank Batch Export Modal */}
      {showBankBatchModal && activeRun && (
        <BankBatchExportModal
          payrollRun={activeRun}
          tenant={tenant}
          employees={employees}
          onClose={() => setShowBankBatchModal(false)}
        />
      )}
    </div>
  );
};
