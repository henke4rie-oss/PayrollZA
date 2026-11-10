/*
"""
Subscription Billing, Market Wedge Strategy & Acquisition Readiness View
Features:
1. Multi-tier subscription model tailored for South African businesses:
   - Free Forever: R0/month (1-5 staff, $0 hosting cost, massive market wedge)
   - Growth Starter: R99/month (up to 15 staff, beats SimplePay/Sage by 78%)
   - Business Pro: R249/month (up to 40 staff, EMP501, IRP5, ETI, COIDA)
   - Accountants Bureau / Enterprise: R599/month (unlimited workspaces for accounting firms)
2. Interactive Competitor Price Benchmark & Savings Calculator:
   - Compares 4mula against SimplePay, Sage Cloud Payroll, and PaySpace.
   - Shows annual savings in ZAR and explains our low-overhead margin economics.
3. Secure Organization Ownership Handover (M&A & Acquisition Protocol):
   - Cryptographic handshake to transfer company workspace without leaving orphaned backdoors.
   - Preserves TAA s29 5-year audit integrity and downgrades former owner to read-only Auditor.
4. Statutory South African Tax Invoices (with 15% VAT breakdown) and voucher redemption.
"""
*/

import React, { useState } from 'react';
import {
  CreditCard,
  Check,
  Sparkles,
  ShieldCheck,
  Building,
  Receipt,
  Download,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  TrendingDown,
  UserCheck,
  KeyRound,
  FileCheck,
  ExternalLink,
  X,
} from 'lucide-react';
import { SubscriptionTier, Tenant, UserRole } from '../types';
import { SUBSCRIPTION_PLANS, storage } from '../utils/storage';
import { hasPermission } from '../utils/security';
import { downloadFile } from '../utils/sarsReports';

interface SubscriptionBillingViewProps {
  tenant: Tenant;
  currentUserRole: UserRole;
  employeeCount: number;
  onUpgradePlan: (tier: SubscriptionTier) => void;
}

export const SubscriptionBillingView: React.FC<SubscriptionBillingViewProps> = ({
  tenant,
  currentUserRole,
  employeeCount,
  onUpgradePlan,
}) => {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Competitor Calculator State
  const [calcEmployees, setCalcEmployees] = useState<number>(Math.max(5, employeeCount || 10));

  // Ownership Transfer State
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [successorEmail, setSuccessorEmail] = useState<string>('');
  const [successorName, setSuccessorName] = useState<string>('');
  const [confirmTransferPhrase, setConfirmTransferPhrase] = useState<string>('');
  const [transferStatus, setTransferStatus] = useState<{ success: boolean; message: string; seal?: string } | null>(null);

  const [billingNotification, setBillingNotification] = useState<{ text: string; success: boolean } | null>(null);

  const canManageBilling = hasPermission(currentUserRole, 'canManageBilling');
  const currentPlan = SUBSCRIPTION_PLANS.find((p) => p.id === tenant.tier) || SUBSCRIPTION_PLANS[0];

  // Competitor Pricing Calculations (South African Market Standards):
  // SimplePay: R50 base + R29/employee/mo
  const simplePayMonthly = 50 + calcEmployees * 29;
  // Sage Business Cloud Payroll: R195 for first 2 employees + R48 per additional employee
  const sageMonthly = 195 + Math.max(0, calcEmployees - 2) * 48;
  // PaySpace: R350 platform base + R32/employee/mo
  const paySpaceMonthly = 350 + calcEmployees * 32;

  // 4mula Pricing:
  let fourMulaMonthly = 0;
  let fourMulaPlanName = 'Micro-Trial Free';
  if (calcEmployees <= 3) {
    fourMulaMonthly = 0;
    fourMulaPlanName = 'Micro-Trial Free';
  } else if (calcEmployees <= 15) {
    fourMulaMonthly = 189;
    fourMulaPlanName = 'Growth Starter';
  } else if (calcEmployees <= 45) {
    fourMulaMonthly = 449;
    fourMulaPlanName = 'Business Pro & Statutory';
  } else {
    fourMulaMonthly = 999;
    fourMulaPlanName = 'Accountants Bureau Practice';
  }

  const annualSavingsVsSimplePay = Math.max(0, (simplePayMonthly - fourMulaMonthly) * 12);
  const annualSavingsVsSage = Math.max(0, (sageMonthly - fourMulaMonthly) * 12);

  const handleSelectPlan = (tier: SubscriptionTier) => {
    if (!canManageBilling) {
      setBillingNotification({
        text: 'Permission Denied: Only the Organization Owner can modify billing and subscription tiers.',
        success: false,
      });
      return;
    }
    if (tier === tenant.tier) return;

    setIsProcessing(tier);
    setTimeout(() => {
      onUpgradePlan(tier);
      setIsProcessing(null);
      setBillingNotification({
        text: `Workspace plan successfully updated to ${tier.toUpperCase()}!`,
        success: true,
      });
      setTimeout(() => setBillingNotification(null), 5000);
    }, 600);
  };



  const handleExecuteOwnershipTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmTransferPhrase.trim().toUpperCase() !== 'TRANSFER OWNERSHIP') {
      setTransferStatus({
        success: false,
        message: 'Security Check Failed: Please type "TRANSFER OWNERSHIP" exactly to confirm.',
      });
      return;
    }

    if (!successorEmail.includes('@')) {
      setTransferStatus({
        success: false,
        message: 'Please enter a valid successor email address.',
      });
      return;
    }

    const res = await storage.transferTenantOwnership(
      tenant.id,
      successorEmail.trim(),
      successorName.trim(),
      true // Downgrade former owner to read-only auditor
    );

    setTransferStatus({
      success: res.success,
      message: res.message,
      seal: res.auditSeal,
    });
  };

  const handleDownloadInvoice = (invNum: string, date: string, amountZAR: number) => {
    const vat = amountZAR > 0 ? (amountZAR * 15) / 115 : 0;
    const subtotal = amountZAR - vat;

    const invoiceContent = [
      `================================================================`,
      `TAX INVOICE - 4MULA WORKOS (PTY) LTD`,
      `VAT Registration No: 4920192847 | Reg: 2024/918291/07`,
      `Cape Town / Paarl, South Africa | billing@4mula.co.za`,
      `================================================================`,
      `Invoice Number:       ${invNum}`,
      `Invoice Date:         ${date}`,
      `Billed To:            ${tenant.name}`,
      `Customer Tax Ref:     ${tenant.sarsPayeNumber || 'N/A'}`,
      `Subscription Plan:    ${tenant.tier.toUpperCase()} Plan`,
      `----------------------------------------------------------------`,
      `Description                           Net (ZAR)     VAT (15%)`,
      `----------------------------------------------------------------`,
      `4mula WorkOS Monthly SaaS Subscription R${subtotal.toFixed(2)}    R${vat.toFixed(2)}`,
      `----------------------------------------------------------------`,
      `TOTAL AMOUNT PAID (INCL VAT):          R${amountZAR.toFixed(2)}`,
      `Payment Method:                        PayFast Instant EFT / Card`,
      `Status:                                PAID (Settled)`,
      `================================================================`,
    ].join('\n');

    downloadFile(`${invNum}.txt`, invoiceContent, 'text/plain');
  };

  return (
    <div className="space-y-6">
      {/* Plan Status Header - Prominent Noticeable Box */}
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl p-6 shadow-xl shadow-black/30 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                {currentPlan.name}
              </span>
              <span className="text-xs text-slate-300 font-mono font-bold">
                {currentPlan.priceZAR === 0 ? 'R0 / month free forever' : `R${currentPlan.priceZAR} / month`}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-2 flex items-center gap-2.5">
              <CreditCard className="w-6 h-6 text-emerald-400" />
              <span>Subscription, Pricing &amp; M&amp;A Protocol</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Disruptive South African payroll pricing: free forever for micro-businesses, scaling to 78% below SimplePay and Sage.
              Architected with strict multi-tenant isolation for seamless company ownership transfer and acquisition due-diligence.
            </p>
          </div>

          {/* Usage Meter - Distinct Box */}
          <div className="bg-slate-950/85 p-4 rounded-xl border border-slate-800 text-xs sm:w-72 shadow-inner">
            <div className="flex justify-between items-baseline mb-1.5">
              <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider font-mono">Headcount Usage</span>
              <span className="font-mono font-bold text-white text-sm">
                {employeeCount} / {currentPlan.maxEmployees}
              </span>
            </div>
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full rounded-full transition-all ${
                  employeeCount >= currentPlan.maxEmployees ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, (employeeCount / currentPlan.maxEmployees) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-2 text-[10px] font-mono text-slate-400">
              <span>{Math.max(0, currentPlan.maxEmployees - employeeCount)} slots available</span>
              <span className="text-emerald-400 font-bold">{Math.round((employeeCount / currentPlan.maxEmployees) * 100)}% utilized</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {billingNotification && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-lg ${
            billingNotification.success
              ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200'
              : 'bg-red-950/70 border-red-500/60 text-red-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{billingNotification.text}</span>
          </div>
          <button
            onClick={() => setBillingNotification(null)}
            className="text-slate-400 hover:text-white p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Subscription Plans Grid - Prominent Tactile Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const isCurrent = plan.id === tenant.tier;
          return (
            <div
              key={plan.id}
              className={`rounded-2xl p-5 flex flex-col justify-between transition-all border shadow-lg ${
                isCurrent
                  ? 'bg-slate-900/95 border-emerald-400 ring-2 ring-emerald-500/40 shadow-emerald-950/40'
                  : 'bg-slate-900/90 border-slate-700/80 hover:border-slate-500 hover:shadow-xl'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-white text-base tracking-tight">{plan.name.split(' (')[0]}</h3>
                  {plan.popular && (
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded font-mono">
                      Wedge Pick
                    </span>
                  )}
                  {isCurrent && (
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-mono">
                      Active
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-extrabold text-white font-mono">
                      {plan.priceZAR === 0 ? 'R0' : `R${plan.priceZAR}`}
                    </span>
                    <span className="text-xs text-slate-400 ml-1.5 font-medium">/ month</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">
                    {plan.maxEmployees >= 900 ? 'Unlimited employees' : `Up to ${plan.maxEmployees} active staff`}
                  </p>
                </div>

                <ul className="mt-5 space-y-2.5 text-xs text-slate-300">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <div className="p-0.5 rounded bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5 border border-emerald-500/20">
                        <Check className="w-3 h-3" />
                      </div>
                      <span className="leading-snug">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800">
                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isCurrent || isProcessing !== null || !canManageBilling}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-slate-800 border border-slate-700 text-slate-400 cursor-default font-mono'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/60 hover:shadow-emerald-900/80'
                  }`}
                >
                  {isCurrent
                    ? 'Current Workspace Plan'
                    : isProcessing === plan.id
                    ? 'Switching...'
                    : plan.priceZAR === 0
                    ? 'Switch to Free Tier'
                    : `Upgrade to ${plan.name.split(' ')[0]}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Competitor Price Benchmark & Market Wedge Calculator */}
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl p-6 shadow-xl shadow-black/30 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                Market Wedge Strategy
              </span>
              <span className="text-xs text-slate-400">South African SaaS Pricing Benchmark</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">How 4mula Beats Every South African Competitor</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Drag the employee slider below to compare monthly &amp; annual costs across all major South African payroll platforms.
            </p>
          </div>

          {/* Headcount Slider Control */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 sm:w-64">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-slate-400 font-bold uppercase text-[10px] font-mono">Simulate Staff Size:</span>
              <span className="font-mono font-extrabold text-emerald-400 text-base">{calcEmployees} Staff</span>
            </div>
            <input
              type="range"
              min="1"
              max="60"
              value={calcEmployees}
              onChange={(e) => setCalcEmployees(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
              <span>1</span>
              <span>15</span>
              <span>30</span>
              <span>60+</span>
            </div>
          </div>
        </div>

        {/* 4-Column Competitor Benchmark Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* SimplePay */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-slate-300 block">SimplePay</span>
                <span className="text-[10px] text-slate-400 font-mono">R50 base + R29/staff</span>
              </div>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">Legacy Per-Head</span>
            </div>
            <div>
              <span className="text-2xl font-extrabold text-slate-200 font-mono">R{simplePayMonthly}</span>
              <span className="text-xs text-slate-400 ml-1">/ month</span>
              <p className="text-[11px] text-slate-400 mt-1 font-mono">
                R{(simplePayMonthly * 12).toLocaleString()} / year
              </p>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              No free tier. Every single employee increases monthly bill.
            </p>
          </div>

          {/* Sage Business Cloud */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-slate-300 block">Sage Cloud Payroll</span>
                <span className="text-[10px] text-slate-400 font-mono">R195 for 2 + R48/extra</span>
              </div>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">Enterprise Legacy</span>
            </div>
            <div>
              <span className="text-2xl font-extrabold text-slate-200 font-mono">R{sageMonthly}</span>
              <span className="text-xs text-slate-400 ml-1">/ month</span>
              <p className="text-[11px] text-slate-400 mt-1 font-mono">
                R{(sageMonthly * 12).toLocaleString()} / year
              </p>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Steep minimum commitment with expensive incremental costs.
            </p>
          </div>

          {/* PaySpace */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-slate-300 block">PaySpace (Deel)</span>
                <span className="text-[10px] text-slate-400 font-mono">R350 base + R32/staff</span>
              </div>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">Corporate Tier</span>
            </div>
            <div>
              <span className="text-2xl font-extrabold text-slate-200 font-mono">R{paySpaceMonthly}</span>
              <span className="text-xs text-slate-400 ml-1">/ month</span>
              <p className="text-[11px] text-slate-400 mt-1 font-mono">
                R{(paySpaceMonthly * 12).toLocaleString()} / year
              </p>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Targeted at large corporates; unviable for early-stage SMMEs.
            </p>
          </div>

          {/* 4mula (The Wedge Disruptor) */}
          <div className="bg-gradient-to-br from-emerald-950/60 via-slate-900 to-teal-950/60 border-2 border-emerald-400 rounded-xl p-4 space-y-3 shadow-lg shadow-emerald-950/40 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>4mula WorkOS</span>
                </span>
                <span className="text-[10px] text-emerald-300 font-mono">{fourMulaPlanName}</span>
              </div>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-mono font-bold uppercase">
                Best Value
              </span>
            </div>
            <div>
              <span className="text-3xl font-black text-emerald-400 font-mono">
                {fourMulaMonthly === 0 ? 'R0' : `R${fourMulaMonthly}`}
              </span>
              <span className="text-xs text-slate-300 ml-1">/ month</span>
              <p className="text-[11px] text-emerald-300/90 mt-1 font-mono font-bold">
                R{(fourMulaMonthly * 12).toLocaleString()} / year
              </p>
            </div>
            <div className="p-2 rounded-lg bg-emerald-900/40 border border-emerald-700/40 text-[11px] text-emerald-200 font-medium">
              Saves <span className="font-bold text-white font-mono">R{annualSavingsVsSimplePay.toLocaleString()}</span>/yr vs SimplePay and <span className="font-bold text-white font-mono">R{annualSavingsVsSage.toLocaleString()}</span>/yr vs Sage!
            </div>
          </div>
        </div>

        {/* Founder Margin Explanation Box */}
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
          <div className="space-y-1">
            <span className="font-bold text-white flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-emerald-400" />
              <span>Why We Can Afford This Pricing (The Zero-Cost Architecture Advantage)</span>
            </span>
            <p className="text-slate-400 leading-relaxed max-w-3xl">
              Traditional payroll software runs expensive SQL database servers and heavy backends that cost tens of thousands per month.
              4mula is architected with a local-first engine and client-side tax calculations: serving 10,000 micro-businesses costs us almost <strong>R0 in server fees</strong>.
              When our users grow into paying tiers (R99/mo or R249/mo), our gross margins exceed <strong>95%</strong>, allowing us to undercut incumbents while printing profit.
            </p>
          </div>
          <div className="shrink-0">
            <span className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-[11px] text-emerald-400 font-bold block text-center">
              Target Gross Margin: &gt;95%
            </span>
          </div>
        </div>
      </div>

      {/* M&A & Secure Ownership Transfer Protocol (Founder Acquisition Readiness) */}
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl p-6 shadow-xl shadow-black/30 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">
                M&amp;A Ready
              </span>
              <span className="text-xs text-slate-400">Legal Handover &amp; Exit Architecture</span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1">Clean Organization Ownership Handover</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Transfer workspace ownership to a new business buyer, managing partner, or acquirer with zero security vulnerabilities.
            </p>
          </div>

          <button
            onClick={() => setShowTransferModal(!showTransferModal)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-xl text-xs font-bold text-white transition-all shadow-md self-start sm:self-auto"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span>{showTransferModal ? 'Hide Transfer Panel' : 'Initiate Ownership Handover'}</span>
          </button>
        </div>

        {/* Due Diligence Checklist for Potential SaaS Acquirers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Strict Multi-Tenant Isolation</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Every company workspace is partitioned by tenant ID. Zero risk of cross-company data leakage during due diligence.
            </p>
          </div>

          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>TAA s29 Bound to Legal Entity</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Tax records and 5-year cryptographic audit seals legally stay with the company registration, not the founder personally.
            </p>
          </div>

          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>POPIA Section 23 Portability</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Complete cryptographic JSON backup bundle can be exported anytime, giving an acquirer immediate portable records.
            </p>
          </div>
        </div>

        {/* Ownership Transfer Form (When Opened) */}
        {showTransferModal && (
          <form onSubmit={handleExecuteOwnershipTransfer} className="p-5 bg-slate-950/90 border border-amber-500/40 rounded-xl space-y-4 animate-fadeIn">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider font-mono">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>Security Warning: Irreversible Legal Handover</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Executing this transfer will reassign primary ownership of <strong>{tenant.name}</strong> to the designated successor.
              Under the Tax Administration Act (s29), all past payroll runs and statutory records will remain attached to this tenant entity.
              Your current user account will be downgraded to a read-only <strong>Auditor</strong> role to preserve compliance access.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-1">
                  Successor Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. new_owner@company.co.za"
                  value={successorEmail}
                  onChange={(e) => setSuccessorEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono mb-1">
                  Successor Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Johan Retief"
                  value={successorName}
                  onChange={(e) => setSuccessorName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-300 font-mono mb-1">
                Type "TRANSFER OWNERSHIP" to Confirm *
              </label>
              <input
                type="text"
                required
                placeholder="TRANSFER OWNERSHIP"
                value={confirmTransferPhrase}
                onChange={(e) => setConfirmTransferPhrase(e.target.value)}
                className="w-full sm:w-80 bg-slate-900 border border-amber-500/50 rounded-lg px-3 py-2 text-white font-mono uppercase focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-950/60 transition-all"
              >
                Execute Handover &amp; Cryptographic Seal
              </button>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>

            {transferStatus && (
              <div
                className={`p-3 rounded-lg text-xs font-medium space-y-1 ${
                  transferStatus.success
                    ? 'bg-emerald-950/80 border border-emerald-700 text-emerald-200'
                    : 'bg-red-950/80 border border-red-700 text-red-200'
                }`}
              >
                <div>{transferStatus.message}</div>
                {transferStatus.seal && (
                  <div className="font-mono text-[10px] text-emerald-300 break-all">
                    SHA-256 Audit Seal: {transferStatus.seal}
                  </div>
                )}
              </div>
            )}
          </form>
        )}
      </div>

      {/* Voucher Code Redemption & PayFast Gateway Integration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Status Card */}
        <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl p-5 shadow-xl shadow-black/20 space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Workspace Subscription Status</span>
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Current Tier: <strong className="text-white uppercase">{tenant.tier}</strong>. To upgrade plans or request dedicated multi-company practice onboarding, contact support at support@payrollza.co.za.
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-300 pt-1">
            <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[11px] font-mono">
              Status: ACTIVE
            </span>
            <span className="text-slate-400 text-[11px]">
              Unlimited statutory payroll and compliance records
            </span>
          </div>
        </div>

        {/* South African Payment Gateway Box */}
        <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl p-5 shadow-xl shadow-black/20 space-y-2">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>South African Payment Gateway (PayFast / Ozow)</span>
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            All ZAR payments are processed in compliance with the South African Reserve Bank (SARB) National Payment System Act.
            Supports Instant EFT (Capitec, FNB, Absa, Standard Bank, Nedbank, TymeBank) and Visa/Mastercard debit cards.
          </p>
          <div className="flex items-center gap-3 pt-2 text-[11px] text-slate-400">
            <span className="flex items-center gap-1 font-semibold text-slate-300">
              <Lock className="w-3 h-3 text-emerald-400" /> PCI-DSS Level 1
            </span>
            <span>•</span>
            <span>Zero Merchant Fees on Free Tier</span>
          </div>
        </div>
      </div>

      {/* SARS Statutory Tax Invoices Table - Noticeable Box */}
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl p-6 shadow-xl shadow-black/30 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-400" />
              <span>South African Tax Invoices</span>
            </h2>
            <p className="text-xs text-slate-400">Section 20 of Value-Added Tax Act No. 89 of 1991</p>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/60">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 uppercase font-bold text-[10px] tracking-wider font-mono">
                <th className="py-3 px-3.5">Invoice Number</th>
                <th className="py-3 px-3">Billing Date</th>
                <th className="py-3 px-3">Plan / Description</th>
                <th className="py-3 px-3">Subtotal</th>
                <th className="py-3 px-3">VAT (15%)</th>
                <th className="py-3 px-3">Total Paid</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3.5 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              <tr className="hover:bg-slate-900/50 transition-colors">
                <td className="py-3 px-3.5 font-bold text-white font-sans">INV-2026-03-01</td>
                <td className="py-3 px-3 text-slate-400">2026-03-01</td>
                <td className="py-3 px-3 text-slate-300 font-sans">{currentPlan.name}</td>
                <td className="py-3 px-3 text-slate-300">R{(currentPlan.priceZAR * 0.85).toFixed(2)}</td>
                <td className="py-3 px-3 text-slate-400">R{(currentPlan.priceZAR * 0.15).toFixed(2)}</td>
                <td className="py-3 px-3 font-bold text-emerald-400">R{currentPlan.priceZAR.toFixed(2)}</td>
                <td className="py-3 px-3 font-sans">
                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 font-mono">
                    Paid
                  </span>
                </td>
                <td className="py-3 px-3.5 text-right font-sans">
                  <button
                    onClick={() => handleDownloadInvoice('INV-2026-03-01', '2026-03-01', currentPlan.priceZAR)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700 inline-flex items-center"
                    title="Download Tax Invoice"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
