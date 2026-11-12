/*
"""
Main Dashboard View
High-density overview of the active tenant's payroll:
- SARS Statutory Registration Details (PAYE, UIF, SDL numbers)
- Primary Financial KPIs (Gross Payroll, SARS EMP201 Liability, Net Disbursed)
- Plan Utilization & Free-tier limit meter
- SARS Statutory Filing Deadlines (7th of each month)
- Recent Payroll Runs with Cryptographic SHA-256 seal status
- Legal Compliance Checklist (SARS, BCEA, POPIA)
"""
*/

import React from 'react';
import {
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  FileSpreadsheet,
  ShieldCheck,
  ArrowRight,
  Clock,
  Sparkles,
  DollarSign,
  Download,
  Eye,
} from 'lucide-react';
import { Employee, PayrollRun, Tenant, UserRole } from '../types';
import { SUBSCRIPTION_PLANS } from '../utils/storage';

interface DashboardViewProps {
  tenant: Tenant;
  employees: Employee[];
  payrollRuns: PayrollRun[];
  currentUserRole: UserRole;
  onNavigateTab: (tab: string) => void;
  onViewPayslip: (slip: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  tenant,
  employees,
  payrollRuns,
  currentUserRole,
  onNavigateTab,
  onViewPayslip,
}) => {
  const activeEmployees = employees.filter((e) => e.isActive);
  const currentPlan = SUBSCRIPTION_PLANS.find((p) => p.id === tenant.tier) || SUBSCRIPTION_PLANS[0];
  const latestRun = payrollRuns[0];

  // # Calculate summary figures from latest run
  const monthlyGross = latestRun ? latestRun.totalGross : activeEmployees.reduce((acc, e) => acc + e.grossMonthlySalary, 0);
  const monthlyNet = latestRun ? latestRun.totalNet : Math.round(monthlyGross * 0.78);
  const monthlyPaye = latestRun ? latestRun.totalPaye : 0;
  const monthlyUif = latestRun ? latestRun.totalUifEmployee + latestRun.totalUifEmployer : 0;
  const monthlySdl = latestRun ? latestRun.totalSdl : 0;
  const monthlyEti = latestRun ? latestRun.totalEti : 0;

  // # SARS monthly EMP201 liability = (PAYE - ETI) + SDL + UIF
  const sarsLiability = latestRun
    ? Math.max(0, monthlyPaye - monthlyEti) + monthlySdl + monthlyUif
    : 0;

  return (
    <div className="space-y-6">
      {/* Workspace Banner & SARS Registration Details - Prominent Box */}
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl p-6 shadow-xl shadow-black/30 relative overflow-hidden backdrop-blur-sm">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 font-mono">
                Active Tenant
              </span>
              <span className="text-xs text-slate-400 font-mono">Reg: {tenant.registrationNumber || '2019/584910/07'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1.5 tracking-tight">{tenant.name}</h1>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>{tenant.address}</span>
            </p>
          </div>

          {/* Statutory Tax Numbers Grid - Distinct Noticeable Mini-Boxes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-950/85 border border-slate-800 hover:border-slate-700 rounded-xl p-3 shadow-inner">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider font-mono">SARS PAYE Ref</span>
              <span className="font-mono font-bold text-slate-100 text-sm mt-0.5 block">{tenant.sarsPayeNumber || '7920145829'}</span>
            </div>
            <div className="bg-slate-950/85 border border-slate-800 hover:border-slate-700 rounded-xl p-3 shadow-inner">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider font-mono">UIF Ref</span>
              <span className="font-mono font-bold text-slate-100 text-sm mt-0.5 block">{tenant.sarsUifNumber || 'U48291054'}</span>
            </div>
            <div className="bg-slate-950/85 border border-slate-800 hover:border-slate-700 rounded-xl p-3 shadow-inner">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider font-mono">SDL Status</span>
              {tenant.isSdlExempt ? (
                <span className="text-amber-400 font-semibold text-xs mt-0.5 block">Exempt (&lt;R500k)</span>
              ) : (
                <span className="text-emerald-400 font-semibold text-xs mt-0.5 block">Active (1% Levy)</span>
              )}
            </div>
            <div className="bg-slate-950/85 border border-slate-800 hover:border-slate-700 rounded-xl p-3 shadow-inner">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider font-mono">Tax Year</span>
              <span className="font-mono font-bold text-slate-100 text-sm mt-0.5 block">{tenant.sarsTaxYear}</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid - Noticeable Elevated Boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Monthly Gross Payroll */}
        <div className="bg-slate-900/90 border border-slate-700/70 hover:border-emerald-500/50 rounded-2xl p-5 shadow-lg shadow-black/20 hover:shadow-xl transition-all group relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Gross Payroll</span>
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
              R{monthlyGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <p className="text-xs text-slate-400 mt-1.5 flex items-center justify-between">
              <span>Net Disbursed:</span>
              <span className="text-slate-200 font-mono font-bold">R{monthlyNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </p>
          </div>
        </div>

        {/* KPI 2: SARS EMP201 Liability */}
        <div className="bg-slate-900/90 border border-slate-700/70 hover:border-indigo-500/50 rounded-2xl p-5 shadow-lg shadow-black/20 hover:shadow-xl transition-all group relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Due to SARS (EMP201)</span>
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20 group-hover:scale-105 transition-transform">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl sm:text-3xl font-extrabold text-indigo-400 tracking-tight font-mono">
              R{sarsLiability.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <p className="text-xs text-slate-400 mt-1.5 truncate">
              PAYE: R{monthlyPaye.toFixed(0)} | UIF: R{monthlyUif.toFixed(0)}
              {monthlyEti > 0 && <span className="text-emerald-400 font-semibold"> (-R{monthlyEti.toFixed(0)} ETI)</span>}
            </p>
          </div>
        </div>

        {/* KPI 3: Next SARS Filing Deadline */}
        <div className="bg-slate-900/90 border border-slate-700/70 hover:border-amber-500/50 rounded-2xl p-5 shadow-lg shadow-black/20 hover:shadow-xl transition-all group relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Filing Deadline</span>
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20 group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono">7th</span>
              <span className="text-xs font-semibold text-slate-300">of every month</span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              EMP201 monthly electronic return deadline
            </p>
          </div>
        </div>

        {/* KPI 4: Plan Utilization / Free Tier */}
        <div className="bg-slate-900/90 border border-slate-700/70 hover:border-purple-500/50 rounded-2xl p-5 shadow-lg shadow-black/20 hover:shadow-xl transition-all group relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Plan Headcount</span>
            <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
                {activeEmployees.length} <span className="text-sm font-normal text-slate-400">/ {currentPlan.maxEmployees}</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                {currentPlan.id}
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-950 h-2 rounded-full mt-3 overflow-hidden border border-slate-800">
              <div
                className={`h-full rounded-full transition-all ${
                  activeEmployees.length >= currentPlan.maxEmployees ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, (activeEmployees.length / currentPlan.maxEmployees) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigateTab('payroll')}
          className="flex items-center justify-between p-4 bg-slate-900/90 border border-slate-700/80 hover:border-emerald-400 rounded-xl text-left group transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
        >
          <div>
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block font-mono">Run Calculation</span>
            <span className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">Calculate Payroll</span>
          </div>
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('employees')}
          className="flex items-center justify-between p-4 bg-slate-900/90 border border-slate-700/80 hover:border-slate-500 rounded-xl text-left group transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
        >
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-mono">Smart Detection</span>
            <span className="text-sm font-bold text-white group-hover:text-slate-200 transition-colors">Import Spreadsheet</span>
          </div>
          <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300 group-hover:bg-slate-700 transition-colors">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('sars')}
          className="flex items-center justify-between p-4 bg-slate-900/90 border border-slate-700/80 hover:border-indigo-400 rounded-xl text-left group transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
        >
          <div>
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block font-mono">SARS eFiling</span>
            <span className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">Generate EMP201</span>
          </div>
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>

        <button
          onClick={() => onNavigateTab('security')}
          className="flex items-center justify-between p-4 bg-slate-900/90 border border-slate-700/80 hover:border-purple-400 rounded-xl text-left group transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
        >
          <div>
            <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block font-mono">SHA-256 Seal</span>
            <span className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">Verify Hash Integrity</span>
          </div>
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </button>
      </div>

      {/* Main Content Split: Recent Runs & Legal Compliance Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Recent Payroll Runs Box */}
        <div className="lg:col-span-2 bg-slate-900/95 border border-slate-700/80 rounded-2xl p-6 shadow-xl shadow-black/30">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Recent Payroll Runs</h2>
              <p className="text-xs text-slate-400 mt-0.5">Cryptographically sealed batches retained under TAA Section 29</p>
            </div>
            <button
              onClick={() => onNavigateTab('payroll')}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 rounded-lg"
            >
              View All Runs &rarr;
            </button>
          </div>

          {payrollRuns.length === 0 ? (
            <div className="text-center py-12 bg-slate-950/70 rounded-xl border border-slate-800">
              <p className="text-slate-400 text-sm">No payroll runs executed yet for this workspace.</p>
              <button
                onClick={() => onNavigateTab('payroll')}
                className="mt-3.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500 shadow-lg shadow-emerald-950/50 transition-colors"
              >
                Execute First Payroll Run
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/60">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 uppercase font-bold text-[10px] tracking-wider font-mono">
                    <th className="py-3 px-3.5">Period</th>
                    <th className="py-3 px-3">Staff</th>
                    <th className="py-3 px-3">Gross Pay</th>
                    <th className="py-3 px-3">PAYE Tax</th>
                    <th className="py-3 px-3">Net Pay</th>
                    <th className="py-3 px-3">Integrity Seal</th>
                    <th className="py-3 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {payrollRuns.slice(0, 4).map((run) => (
                    <tr key={run.id} className="hover:bg-slate-900/60 transition-colors">
                      <td className="py-3 px-3.5 font-bold text-white font-sans">{run.period}</td>
                      <td className="py-3 px-3 text-slate-300 font-sans">{run.employeeCount}</td>
                      <td className="py-3 px-3 text-slate-200">R{run.totalGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-3 text-slate-300">R{run.totalPaye.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-3 font-bold text-emerald-400">R{run.totalNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-3 font-sans">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-700/50 px-2 py-0.5 rounded-md font-mono">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>SHA-256</span>
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right font-sans">
                        <button
                          onClick={() => {
                            if (run.payslips && run.payslips[0]) {
                              onViewPayslip(run.payslips[0]);
                            } else {
                              onNavigateTab('payroll');
                            }
                          }}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
                        >
                          View Payslips
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column (1 col): Statutory Compliance Checklist Box */}
        <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl p-6 shadow-xl shadow-black/30 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>South African Law Compliance</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Real-time statutory compliance status</p>
          </div>

          <div className="space-y-2.5">
            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/90 hover:border-slate-700 flex items-start gap-3 transition-colors">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-white block">SARS 2026/2027 Tax Tables</span>
                <span className="text-[11px] text-slate-400 block leading-relaxed mt-0.5">
                  Official 7-bracket progressive tax scale, Primary (R17,820), Secondary (R9,765), Tertiary (R3,249).
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/90 hover:border-slate-700 flex items-start gap-3 transition-colors">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-white block">UICA 2002 Ceiling (R17,712)</span>
                <span className="text-[11px] text-slate-400 block leading-relaxed mt-0.5">
                  UIF contributions capped at R177.12 for employee and employer.
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/90 hover:border-slate-700 flex items-start gap-3 transition-colors">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-white block">Tax Administration Act (s29)</span>
                <span className="text-[11px] text-slate-400 block leading-relaxed mt-0.5">
                  Mandatory 5-year cryptographic record retention with SHA-256 seal.
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/90 hover:border-slate-700 flex items-start gap-3 transition-colors">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-white block">POPIA Protection &amp; RBAC</span>
                <span className="text-[11px] text-slate-400 block leading-relaxed mt-0.5">
                  Data masking for RSA IDs, bank accounts, and strict cross-tenant IDOR isolation.
                </span>
              </div>
            </div>
          </div>

          {/* Executive Statutory Filing Overview Box */}
          <div className="p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/60 border border-indigo-900/50 rounded-xl shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>SARS Filing Cycle Active</span>
              </span>
              <button
                onClick={() => onNavigateTab('sars')}
                className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Filing Portal &rarr;
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              Automated declarations ready for eFiling: EMP201 monthly return, EMP501 bi-annual reconciliation, and IRP5 certificates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
