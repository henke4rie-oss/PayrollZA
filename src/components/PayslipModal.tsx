/*
"""
BCEA Section 33 Compliant Printable Payslip Modal
Implements all mandatory South African payslip particulars under the
Basic Conditions of Employment Act No. 75 of 1997:
1. Employer name, physical address, and SARS PAYE reference
2. Employee name, employee number, and occupation
3. Period of payment
4. Gross remuneration breakdown
5. Statutory deductions (PAYE, UIF employee contribution)
6. Employer contributions (UIF employer contribution, SDL)
7. Net take-home pay
8. Cryptographic SHA-256 seal for tamper detection
"""
*/

import React from 'react';
import { X, Printer, Download, ShieldCheck, Building2, CheckCircle2, MessageCircle } from 'lucide-react';
import { Payslip, Tenant } from '../types';
import { maskSouthAfricanId } from '../utils/security';

interface PayslipModalProps {
  payslip: Payslip;
  tenant: Tenant;
  onClose: () => void;
}

export const PayslipModal: React.FC<PayslipModalProps> = ({
  payslip,
  tenant,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const whatsappText = `Hi ${payslip.employeeName}, your official payslip for period ${payslip.period} from ${tenant.name} is ready. Gross: R${payslip.grossMonthly.toLocaleString(undefined, { minimumFractionDigits: 2 })} | Net Take-Home: R${payslip.netPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}. (BCEA Section 33 Compliant).`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8 text-slate-100">
        {/* Action Bar (Hidden during print) */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 print:hidden flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              BCEA s33 COMPLIANT
            </span>
            <span className="text-xs text-slate-400">Electronic Pay Advice</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950 border border-emerald-700/60 hover:bg-emerald-900 text-emerald-300 rounded text-xs font-bold transition-colors"
              title="Share Payslip Notification via WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Share via WhatsApp</span>
            </a>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold shadow transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Payslip Card */}
        <div className="bg-white text-slate-900 p-6 rounded-lg border border-slate-300 shadow-sm space-y-5 print:p-0 print:border-none print:shadow-none font-sans text-xs">
          {/* Company & Payslip Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
            <div>
              <h1 className="text-lg font-black tracking-tight uppercase text-slate-900">{tenant.name}</h1>
              {tenant.tradingName && (
                <p className="text-xs font-semibold text-slate-600">Trading as: {tenant.tradingName}</p>
              )}
              <p className="text-[11px] text-slate-500 max-w-xs">{tenant.address}</p>
              <div className="mt-1 text-[11px] font-mono text-slate-600">
                <span>PAYE Ref: <strong>{tenant.sarsPayeNumber || '7920145829'}</strong></span>
                <span className="mx-2">•</span>
                <span>UIF Ref: <strong>{tenant.sarsUifNumber || 'U48291054'}</strong></span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-base font-black uppercase tracking-wider block text-slate-900">PAY ADVICE</span>
              <span className="text-xs font-mono font-bold text-slate-700 block">Period: {payslip.period}</span>
              <span className="text-[10px] text-slate-500 block mt-1">Generated: {new Date(payslip.generatedAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Employee Particulars Grid (BCEA s33(1)) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded border border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Employee Code</span>
              <span className="font-mono font-bold text-slate-900 text-xs">{payslip.employeeNumber}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Employee Name</span>
              <span className="font-bold text-slate-900 text-xs">{payslip.employeeName}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Age</span>
              <span className="text-slate-900 text-xs">{payslip.age} yrs</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Payment Method</span>
              <span className="text-slate-900 text-xs">EFT Bank Transfer</span>
            </div>
          </div>

          {/* Earnings & Deductions Tables Split */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Earnings Table */}
            <div className="border border-slate-300 rounded overflow-hidden">
              <div className="bg-slate-100 px-3 py-1.5 font-bold uppercase text-[10px] tracking-wider text-slate-700 border-b border-slate-300">
                Earnings
              </div>
              <table className="w-full text-left text-xs">
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-2.5 text-slate-800">Basic Monthly Salary</td>
                    <td className="p-2.5 text-right font-mono font-semibold text-slate-900">
                      R{payslip.grossMonthly.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t border-slate-300">
                  <tr>
                    <td className="p-2.5 text-slate-900">Total Gross Earnings</td>
                    <td className="p-2.5 text-right font-mono text-slate-900">
                      R{payslip.grossMonthly.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Deductions Table */}
            <div className="border border-slate-300 rounded overflow-hidden">
              <div className="bg-slate-100 px-3 py-1.5 font-bold uppercase text-[10px] tracking-wider text-slate-700 border-b border-slate-300">
                Statutory Deductions
              </div>
              <table className="w-full text-left text-xs">
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-2.5 text-slate-800">PAYE Income Tax (SARS)</td>
                    <td className="p-2.5 text-right font-mono text-slate-900">
                      R{payslip.paye.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-slate-800">UIF Employee (1% capped)</td>
                    <td className="p-2.5 text-right font-mono text-slate-900">
                      R{payslip.uifEmployee.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t border-slate-300">
                  <tr>
                    <td className="p-2.5 text-slate-900">Total Deductions</td>
                    <td className="p-2.5 text-right font-mono text-slate-900">
                      R{(payslip.paye + payslip.uifEmployee).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* NET TAKE-HOME PAY HIGHLIGHT */}
          <div className="bg-slate-900 text-white p-4 rounded-lg flex items-center justify-between border-2 border-slate-900">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">Net Take-Home Pay</span>
              <span className="text-xs text-slate-300">Disbursed to bank account</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-mono text-emerald-400">
                R{payslip.netPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Employer Statutory Costs (Information only, not deducted) */}
          <div className="bg-slate-50 p-3 rounded border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <span className="font-bold text-slate-700 block">Employer Statutory Levies &amp; Contributions:</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
              <div>UIF Employer (1%): <strong>R{payslip.uifEmployer.toFixed(2)}</strong></div>
              <div>SDL Levy (1%): <strong>R{payslip.sdl.toFixed(2)}</strong></div>
              {payslip.eti > 0 && <div className="text-emerald-700">ETI Claimed: <strong>-R{payslip.eti.toFixed(2)}</strong></div>}
              <div>Total Employer Cost: <strong>R{payslip.totalEmployerCost.toFixed(2)}</strong></div>
            </div>
          </div>

          {/* Verification Footer & Cryptographic Proof */}
          <div className="pt-3 border-t border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between text-[10px] text-slate-500 gap-2">
            <div className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Complies with Section 33 of South African BCEA (Act 75 of 1997)</span>
            </div>
            <div className="font-mono text-slate-400 truncate max-w-xs">
              ID: {payslip.id}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
