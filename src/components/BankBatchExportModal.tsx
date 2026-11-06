/*
"""
South African Bank Batch Payment (EFT) Export & Pre-Disbursement Audit Modal
Features:
1. Line-by-line pre-disbursement audit table (Name, Bank, Branch, Account, Net ZAR)
2. Total Batch Sum & Headcount reconciliation
3. Support for FNB Enterprise, Standard Bank, Capitec, Nedbank, and Absa formats
4. "Cover Your Ass" Safety & Zero-Liability Confirmation Barrier:
   - Mandatory verification checkbox requiring the user to confirm they have audited all accounts
   - Explicit disclaimer absolving 4mula under Section 4.3 of our Terms of Service
"""
*/

import React, { useState } from 'react';
import {
  X,
  Download,
  ShieldCheck,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Landmark,
} from 'lucide-react';
import { Employee, PayrollRun, Tenant } from '../types';
import {
  BankBatchRow,
  BankExportFormat,
  buildBankBatchRows,
  generateBankBatchFile,
} from '../utils/bankExport';
import { downloadFile } from '../utils/sarsReports';

interface BankBatchExportModalProps {
  payrollRun: PayrollRun;
  tenant: Tenant;
  employees: Employee[];
  onClose: () => void;
}

export const BankBatchExportModal: React.FC<BankBatchExportModalProps> = ({
  payrollRun,
  tenant,
  employees,
  onClose,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<BankExportFormat>('universal_csv');
  const [hasAuditedAccounts, setHasAuditedAccounts] = useState<boolean>(false);
  const [showFullAccountNumbers, setShowFullAccountNumbers] = useState<boolean>(false);

  const [validationError, setValidationError] = useState<string | null>(null);

  const rows: BankBatchRow[] = buildBankBatchRows(payrollRun, employees);
  const totalBatchZAR = Math.round(rows.reduce((sum, r) => sum + r.netAmountZAR, 0) * 100) / 100;

  const handleDownloadBatch = () => {
    if (!hasAuditedAccounts) {
      setValidationError('Safety Guard: You must verify and confirm the audit checkbox below before downloading this payment file.');
      return;
    }
    setValidationError(null);
    const { filename, content } = generateBankBatchFile(rows, tenant.name, selectedFormat);
    downloadFile(filename, content, 'text/csv;charset=utf-8;');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-5 my-8 text-slate-100 relative">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                  South African EFT Gateway
                </span>
                <span className="text-xs text-slate-400 font-mono">Period: {payrollRun.period}</span>
              </div>
              <h2 className="text-xl font-extrabold text-white tracking-tight mt-1">
                Bank Batch Payment (EFT) Export &amp; Audit
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Batch Overview Summary Box */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Company Account Name</span>
            <span className="font-bold text-white text-sm mt-0.5 block">{tenant.name}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Recipients Headcount</span>
            <span className="font-mono font-bold text-slate-200 text-sm mt-0.5 block">{rows.length} Active Staff</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-400 font-mono block">Total Batch Net Payout</span>
            <span className="font-mono font-black text-emerald-400 text-base mt-0.5 block">
              R{totalBatchZAR.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Bank Format Selector & Masking Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <label htmlFor="bank-format-select" className="font-bold text-slate-400 uppercase text-[10px] font-mono">
              Target Bank Template:
            </label>
            <select
              id="bank-format-select"
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value as BankExportFormat)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="universal_csv">Universal South African Bank CSV (All Banks)</option>
              <option value="fnb_enterprise">FNB Online Banking Enterprise CSV</option>
              <option value="standard_bank">Standard Bank Business Online CSV</option>
            </select>
          </div>

          <button
            onClick={() => setShowFullAccountNumbers(!showFullAccountNumbers)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors self-start sm:self-auto"
          >
            {showFullAccountNumbers ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showFullAccountNumbers ? 'Mask Account Numbers' : 'Reveal Full Account Numbers'}</span>
          </button>
        </div>

        {/* Beneficiary Table */}
        <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/60 max-h-60 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 uppercase font-bold text-[10px] tracking-wider font-mono sticky top-0">
                <th className="py-2.5 px-3">Code</th>
                <th className="py-2.5 px-3">Recipient Name</th>
                <th className="py-2.5 px-3">Bank Name</th>
                <th className="py-2.5 px-3">Branch Code</th>
                <th className="py-2.5 px-3">Account Number</th>
                <th className="py-2.5 px-3 text-right">Net Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {rows.map((row) => (
                <tr key={row.employeeId} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-2.5 px-3 text-slate-400 font-sans">{row.employeeCode}</td>
                  <td className="py-2.5 px-3 font-semibold text-white font-sans">{row.fullName}</td>
                  <td className="py-2.5 px-3 text-slate-300 font-sans">{row.bankName}</td>
                  <td className="py-2.5 px-3 text-slate-400">{row.bankBranchCode}</td>
                  <td className="py-2.5 px-3 text-slate-200">
                    {showFullAccountNumbers
                      ? row.bankAccountNumber
                      : `••••••${row.bankAccountNumber.slice(-4)}`}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                    R{row.netAmountZAR.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* "Cover Your Ass" Legal Safety Disclaimer Box */}
        <div className="p-4 bg-amber-950/30 border border-amber-600/50 rounded-xl space-y-2 text-xs">
          <div className="flex items-center gap-2 text-amber-300 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>MANDATORY PRE-PAYMENT AUDIT &amp; DISCLAIMER</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            4mula is a self-service calculation and compilation software tool. <strong>We do not hold funds, execute financial transfers, or verify recipient account ownership.</strong>{' '}
            You are solely responsible under South African banking regulations for auditing that the account numbers and branch codes in this file belong to the designated employees before releasing funds in your online banking profile. Under Section 4 of our Terms of Service, 4mula accepts zero liability for incorrect beneficiary entries, Business Email Compromise, or social engineering.
          </p>

          <label className="flex items-start gap-2.5 pt-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hasAuditedAccounts}
              onChange={(e) => setHasAuditedAccounts(e.target.checked)}
              className="mt-0.5 accent-emerald-500 w-4 h-4 rounded cursor-pointer"
            />
            <span className="text-xs font-bold text-white">
              I have audited all beneficiary names, bank account numbers, and net pay amounts in this batch, and I confirm they are accurate.
            </span>
          </label>
        </div>

        {/* Validation Error Feedback */}
        {validationError && (
          <div className="p-3 bg-red-950/50 border border-red-500/60 rounded-xl text-xs text-red-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleDownloadBatch}
            disabled={!hasAuditedAccounts}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg ${
              hasAuditedAccounts
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/60'
                : 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Download Bank Batch File ({selectedFormat === 'fnb_enterprise' ? 'FNB' : selectedFormat === 'standard_bank' ? 'Standard Bank' : 'Universal CSV'})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
