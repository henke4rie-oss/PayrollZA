/*
"""
4mula WorkOS - Public Landing Page, SEO Knowledge Hub & Concierge Access Portal
Features:
1. High-converting Hero with Sub-10ms calculation and SARS statutory guarantees
2. Strategic Accountants Bureau section for bookkeepers and tax practitioners
3. Transparent Competitor Pricing Matrix (4mula vs SimplePay vs Sage vs PaySpace)
4. Comprehensive South African Tax, BCEA & Payroll Knowledge Hub (Blog) with full article reader modal
5. Concierge Access & 30-Day License Key Activation modal (WhatsApp & Email direct to Henke)
6. Interactive FAQ section answering security, banking, POPIA, and migration questions
7. Seamless toggle to jump into the full interactive WorkOS application
"""
*/

import React, { useState } from 'react';
import {
  ShieldCheck,
  Zap,
  CheckCircle2,
  Lock,
  ArrowRight,
  TrendingDown,
  Building2,
  Users,
  FileSpreadsheet,
  FileCheck,
  Landmark,
  Share2,
  Mail,
  HelpCircle,
  ExternalLink,
  Search,
  BookOpen,
  X,
  Sparkles,
  PhoneCall,
  Check,
  Clock,
  Layers,
  ChevronRight,
  KeyRound,
  Download,
} from 'lucide-react';
import { BLOG_ARTICLES, BlogArticle } from '../data/blogArticles';
import { SUBSCRIPTION_PLANS, storage } from '../utils/storage';
import { SubscriptionTier, Tenant } from '../types';

interface LandingPageViewProps {
  onLaunchApp: () => void;
  activeTenant: Tenant;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onLaunchApp,
  activeTenant,
}) => {
  const [selectedArticle, setSelectedArticle] = useState<BlogArticle | null>(null);
  const [blogCategoryFilter, setBlogCategoryFilter] = useState<string>('all');
  const [blogSearchQuery, setBlogSearchQuery] = useState<string>('');
  const [showLicenseModal, setShowLicenseModal] = useState<boolean>(false);
  const [enteredLicenseKey, setEnteredLicenseKey] = useState<string>('');
  const [activationFeedback, setActivationFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Calculator state
  const [compareEmployees, setCompareEmployees] = useState<number>(12);

  // Filter blog articles
  const filteredArticles = BLOG_ARTICLES.filter((art) => {
    const matchesCat = blogCategoryFilter === 'all' || art.category === blogCategoryFilter;
    const matchesSearch =
      art.title.toLowerCase().includes(blogSearchQuery.toLowerCase()) ||
      art.excerpt.toLowerCase().includes(blogSearchQuery.toLowerCase()) ||
      art.keywords.some((k) => k.toLowerCase().includes(blogSearchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const categories = ['all', 'SARS Tax', 'BCEA Law', 'Accountant Practice', 'Youth ETI', 'Banking & EFT'];

  // Competitor calculations
  const simplePayMonthly = 50 + compareEmployees * 29;
  const sageMonthly = 195 + Math.max(0, compareEmployees - 2) * 48;
  const paySpaceMonthly = 350 + compareEmployees * 32;

  let fourMulaMonthly = 189;
  if (compareEmployees <= 3) fourMulaMonthly = 0;
  else if (compareEmployees <= 15) fourMulaMonthly = 189;
  else if (compareEmployees <= 45) fourMulaMonthly = 449;
  else fourMulaMonthly = 999;

  const annualSavingsVsSimplePay = Math.max(0, (simplePayMonthly - fourMulaMonthly) * 12);
  const annualSavingsVsSage = Math.max(0, (sageMonthly - fourMulaMonthly) * 12);



  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Banner: Accountant Focus */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border-b border-emerald-500/20 py-2 px-4 text-center text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 flex-wrap text-slate-300">
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold font-mono text-[10px] uppercase border border-emerald-500/30">
            Accountant Bureau Release
          </span>
          <span>South African accounting firms: Run unlimited client payrolls for R999/mo with zero per-head software fees.</span>
          <button
            onClick={onLaunchApp}
            className="text-emerald-400 font-bold hover:underline inline-flex items-center gap-1"
          >
            Launch Live Demo <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Public Navigation */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-indigo-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-emerald-950/60 font-mono">
              4M
            </div>
            <div>
              <span className="font-extrabold text-lg text-white tracking-tight flex items-center gap-1.5 font-sans">
                4mula <span className="text-emerald-400 font-mono text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">WorkOS</span>
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">People, Payroll &amp; Compliance</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <a href="#features" className="hover:text-emerald-400 transition-colors">Features</a>
            <a href="#accountants" className="hover:text-emerald-400 transition-colors">For Accountants</a>
            <a href="#pricing" className="hover:text-emerald-400 transition-colors">Pricing &amp; Savings</a>
            <a href="#knowledge-hub" className="hover:text-emerald-400 transition-colors">Tax Knowledge Hub</a>
            <a href="#faq" className="hover:text-emerald-400 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowLicenseModal(true)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-900 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>Enter License Key</span>
            </button>
            <button
              onClick={onLaunchApp}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-lg shadow-emerald-950 transition-all flex items-center gap-1.5"
            >
              <span>Open WorkOS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-slate-950 to-slate-950 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700/80 text-xs text-slate-300 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono font-semibold">SARS 2026/2027 Tax Tables Verified • BCEA s33 Compliant</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15]">
              South Africa’s Modern Payroll &amp; Statutory Compliance Engine.
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
              Sub-10ms SARS tax calculations, automated EMP201 &amp; EMP501 filings, BCEA Section 33 printable payslips with WhatsApp dispatch, and one-click South African Bank Batch (EFT) exports.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={onLaunchApp}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-extrabold shadow-xl shadow-emerald-950 transition-all flex items-center justify-center gap-2"
              >
                <span>Test-Drive Interactive Demo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowLicenseModal(true)}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-sm font-bold transition-all flex items-center justify-center gap-2"
              >
                <PhoneCall className="w-4 h-4 text-emerald-400" />
                <span>Request 30-Day Founder Pilot</span>
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-10 text-left">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Calculation Speed</span>
                <span className="text-2xl font-black text-emerald-400 font-mono mt-0.5 block">&lt; 10ms</span>
                <span className="text-[11px] text-slate-400">Pure local-first performance</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Statutory Compliance</span>
                <span className="text-2xl font-black text-white font-mono mt-0.5 block">100% SARS</span>
                <span className="text-[11px] text-slate-400">EMP201, EMP501, IRP5, UI-19</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Accountant Bureau</span>
                <span className="text-2xl font-black text-indigo-400 font-mono mt-0.5 block">Unlimited</span>
                <span className="text-[11px] text-slate-400">Multi-tenant client workspaces</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Privacy &amp; Data Shield</span>
                <span className="text-2xl font-black text-purple-400 font-mono mt-0.5 block">POPIA</span>
                <span className="text-[11px] text-slate-400">Zero cloud tracking or leaks</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Bento Grid */}
      <section id="features" className="py-20 border-b border-slate-800 bg-slate-950/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
              Engineered For South African Statutory Reality
            </h2>
            <h3 className="text-3xl font-black text-white tracking-tight">
              Everything Your Payroll Needs. None of the Per-Employee Extortion.
            </h3>
            <p className="text-sm text-slate-300">
              Built specifically around the Tax Administration Act, BCEA Section 33, and Department of Employment and Labour electronic filing standards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 shadow-lg hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <FileCheck className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">Full SARS Statutory Suite</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Generate monthly EMP201 returns with 1-click clipboard paste to SARS eFiling, bi-annual EMP501 reconciliations, IRP5/IT3(a) certificates, and SARS e@syFile CSV batch files.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 shadow-lg hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Landmark className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">Bank Batch Payment (EFT) Export</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Export verified batch payment files for FNB Online Banking Enterprise, Standard Bank Business Online, and Universal Bank CSV (Capitec, Nedbank, Absa) with mandatory pre-disbursement fraud verification.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 shadow-lg hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Share2 className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">BCEA Payslips + WhatsApp Delivery</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Clean printable payslips meeting all 10 statutory conditions of BCEA Section 33, with 1-click WhatsApp notification dispatch that costs zero API fees and shields sensitive ID numbers.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 shadow-lg hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Zap className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">Youth ETI Cash-Back Maximizer</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Automatically claims up to R1,500/month per qualifying youth employee (18–29 years old) directly offsetting PAYE on EMP201, backed by a complete statutory ETI audit schedule.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 shadow-lg hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">Smart Excel/CSV Auto-Classifier</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Migrating from Excel or Sage? Our heuristic importer detects 13-digit RSA IDs, salaries, and employee codes without demanding strict column headers or reformatting.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 shadow-lg hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Lock className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">POPIA &amp; SARS TAA s29 Audit Trail</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Cryptographic SHA-256 tamper seals for every payroll batch, strict tenant isolation (zero IDOR), role-based permissions, and 5-year statutory retention tracking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* For Accountants Bureau Section */}
      <section id="accountants" className="py-20 border-b border-slate-800 bg-gradient-to-b from-slate-950 via-slate-900/60 to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-tr from-slate-900 via-slate-900/95 to-indigo-950/60 border border-indigo-500/30 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
            <div className="max-w-3xl space-y-6">
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-bold text-xs uppercase tracking-wider border border-indigo-500/40 inline-flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                The Accountant &amp; Bookkeeper Distribution Model
              </span>

              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Turn Client Payroll from a Low-Margin Chore into an 80% Profit Machine.
              </h2>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Legacy software charges you per-employee across every client, devouring over 60% of your payroll billing. 4mula’s **Accountants Bureau Tier (R999/month flat)** gives your firm unlimited client workspaces.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Typical Client Billing</span>
                  <span className="text-xl font-black text-white font-mono mt-1 block">R5,000 / mo</span>
                  <span className="text-[11px] text-slate-400">10 clients @ R500/month</span>
                </div>
                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">4mula Bureau Cost</span>
                  <span className="text-xl font-black text-emerald-400 font-mono mt-1 block">R999 / mo</span>
                  <span className="text-[11px] text-slate-400">Flat rate, zero per-head tax</span>
                </div>
                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 font-mono block">Your Monthly Profit</span>
                  <span className="text-xl font-black text-emerald-300 font-mono mt-1 block">+ R4,001 / mo</span>
                  <span className="text-[11px] text-emerald-400/90 font-semibold">80.0% pure practice margin</span>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap items-center gap-4">
                <button
                  onClick={onLaunchApp}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-lg transition-all flex items-center gap-2"
                >
                  <span>Explore Accountant Workspace Switcher</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowLicenseModal(true)}
                  className="px-6 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs transition-all flex items-center gap-2"
                >
                  <Mail className="w-4 h-4 text-emerald-400" />
                  <span>Request Bureau Pilot Credentials</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing & Savings Benchmark Section */}
      <section id="pricing" className="py-20 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
              Transparent, Defensible Value
            </h2>
            <h3 className="text-3xl font-black text-white tracking-tight">
              Fair Pricing that Commands Trust Without Extorting Your Margin
            </h3>
            <p className="text-sm text-slate-300">
              No hidden fees, no per-employee surprises, and no price increases when you hire an extra worker.
            </p>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-2xl p-6 border transition-all flex flex-col justify-between shadow-xl ${
                  plan.popular
                    ? 'bg-slate-900/95 border-emerald-500/60 ring-2 ring-emerald-500/20'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase font-mono text-slate-400 tracking-wider">
                      {plan.name}
                    </span>
                    {plan.popular && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                        POPULAR
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-white font-mono">
                        {plan.priceZAR === 0 ? 'R0' : `R${plan.priceZAR}`}
                      </span>
                      <span className="text-xs text-slate-400">/ month</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {plan.maxEmployees} active staff limit • {plan.maxTenants === 999 ? 'Unlimited companies' : `${plan.maxTenants} company`}
                    </p>
                  </div>

                  <ul className="space-y-2 text-xs text-slate-300 border-t border-slate-800/80 pt-4">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6">
                  <button
                    onClick={() => {
                      if (plan.id === 'free') {
                        onLaunchApp();
                      } else {
                        setShowLicenseModal(true);
                      }
                    }}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 ${
                      plan.popular
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/60'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    <span>{plan.id === 'free' ? 'Test Drive Free' : 'Request License Pilot'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Interactive Savings Calculator */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h4 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-emerald-400" />
                  <span>South African Competitor Savings Calculator</span>
                </h4>
                <p className="text-xs text-slate-400">
                  See how much your business or practice saves every month compared to SimplePay, Sage, and PaySpace.
                </p>
              </div>

              <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                <span className="text-xs font-bold text-slate-300">Headcount:</span>
                <input
                  type="range"
                  min="3"
                  max="50"
                  value={compareEmployees}
                  onChange={(e) => setCompareEmployees(parseInt(e.target.value, 10))}
                  className="accent-emerald-500 cursor-pointer w-32"
                />
                <span className="text-sm font-black text-emerald-400 font-mono w-10 text-right">
                  {compareEmployees}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">SimplePay</span>
                <span className="text-lg font-bold text-slate-200 font-mono mt-1 block">R{simplePayMonthly} / mo</span>
                <span className="text-[10px] text-slate-500">R50 base + R29/emp</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Sage Business Cloud</span>
                <span className="text-lg font-bold text-slate-200 font-mono mt-1 block">R{sageMonthly} / mo</span>
                <span className="text-[10px] text-slate-500">R195 base + R48/emp</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">PaySpace</span>
                <span className="text-lg font-bold text-slate-200 font-mono mt-1 block">R{paySpaceMonthly} / mo</span>
                <span className="text-[10px] text-slate-500">R350 base + R32/emp</span>
              </div>
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50">
                <span className="text-[10px] uppercase font-bold text-emerald-400 font-mono block">4mula WorkOS</span>
                <span className="text-xl font-black text-emerald-300 font-mono mt-1 block">R{fourMulaMonthly} / mo</span>
                <span className="text-[10px] text-emerald-400 font-semibold">Flat Rate ({annualSavingsVsSage > 0 ? `Save R${annualSavingsVsSage.toLocaleString()}/yr` : 'Best Value'})</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEO Tax & Payroll Knowledge Hub (Blog) */}
      <section id="knowledge-hub" className="py-20 border-b border-slate-800 bg-slate-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono mb-2">
                <BookOpen className="w-4 h-4" />
                <span>Statutory Compliance &amp; Tax Guides</span>
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">
                South African Payroll &amp; SARS Knowledge Hub
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                Expert statutory breakdowns, BCEA labour requirements, and practical checklists written by South African payroll and tax practitioners.
              </p>
            </div>

            {/* Search Box */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search tax brackets, EMP201, ETI..."
                value={blogSearchQuery}
                onChange={(e) => setBlogSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setBlogCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  blogCategoryFilter === cat
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat === 'all' ? 'All Guides' : cat}
              </button>
            ))}
          </div>

          {/* Articles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((art) => (
              <article
                key={art.id}
                onClick={() => setSelectedArticle(art)}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-emerald-500/50 hover:shadow-xl transition-all cursor-pointer group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-bold border border-slate-700">
                      {art.category}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {art.readTime}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors leading-snug">
                    {art.title}
                  </h3>

                  <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                    {art.excerpt}
                  </p>

                  <div className="space-y-1.5 pt-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-mono block">Key Takeaway:</span>
                    <div className="text-[11px] text-slate-300 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 italic">
                      "{art.keyTakeaways[0]}"
                    </div>
                  </div>
                </div>

                <div className="pt-5 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-emerald-400 mt-4">
                  <span>Read Statutory Guide</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive FAQ Section */}
      <section id="faq" className="py-20 border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
              Frequently Asked Questions
            </h2>
            <h3 className="text-3xl font-black text-white tracking-tight">
              Honest Answers About 4mula Security &amp; Access
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>How does the 30-Day Access Pilot work if there is no payment gateway?</span>
              </h4>
              <p className="text-slate-300 leading-relaxed">
                As an early-stage founder focused on direct customer relationships, Henke issues pilot license keys directly. You can test drive the full platform for 30 days without entering credit cards. When you decide to subscribe, we issue a standard South African tax invoice with 15% VAT for direct EFT payment, and send your renewed 30-day or 1-year activation code.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Does 4mula move company funds or connect directly to bank accounts?</span>
              </h4>
              <p className="text-slate-300 leading-relaxed">
                <strong>No. 4mula never moves funds or connects to your banking credentials.</strong> We compile formatted batch payment files (Universal CSV, FNB Enterprise, Standard Bank) for you to upload directly into your online banking portal. You maintain 100% control over authorizing payments.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>How is employee personal information protected under POPIA?</span>
              </h4>
              <p className="text-slate-300 leading-relaxed">
                4mula operates on a local-first, zero-telemetry architecture. All employee records, salaries, and 13-digit RSA IDs reside in your private workspace storage. Visual masking protects sensitive identity data from onlookers in open offices, and cryptographic SHA-256 seals verify that calculations have not been altered.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Can I migrate employees from an existing Excel spreadsheet?</span>
              </h4>
              <p className="text-slate-300 leading-relaxed">
                Yes! Our built-in Smart Importer analyzes pasted rows and automatically detects 13-digit RSA IDs (using the Luhn checksum), monthly salaries, and employee codes without requiring you to rename your Excel columns.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Public Footer */}
      <footer className="py-12 bg-slate-950 border-t border-slate-900 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white font-mono text-xs">
                4M
              </div>
              <span className="font-extrabold text-white text-sm">4mula WorkOS</span>
              <span className="text-slate-500">•</span>
              <span>People, Payroll &amp; Statutory Compliance</span>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <button onClick={() => setShowLicenseModal(true)} className="hover:text-emerald-400 transition-colors">
                Contact Founder (Henke)
              </button>
              <button onClick={onLaunchApp} className="hover:text-emerald-400 transition-colors">
                Launch Applet
              </button>
            </div>
          </div>

          <div className="border-t border-slate-900 pt-6 text-[11px] text-slate-300 leading-relaxed space-y-2">
            <p>
              <strong>Statutory Notice:</strong> 4mula is a self-service calculation and statutory compilation software platform. It is not an authorized financial services provider or money transmission business under the National Payment System Act. Users are solely responsible for verifying bank batch account entries before releasing funds.
            </p>
            <p>
              &copy; 2026 4mula WorkOS. South Africa. Designed for local-first zero-cost performance.
            </p>
          </div>
        </div>
      </footer>

      {/* Article Reader Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 text-slate-100 max-h-[90vh] overflow-y-auto relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                    {selectedArticle.category}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{selectedArticle.readTime}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-2">
                  {selectedArticle.title}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                  <span>By {selectedArticle.author}</span>
                  <span>•</span>
                  <span>Updated {selectedArticle.publishedDate}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Key Takeaways */}
            <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl space-y-2 text-xs">
              <span className="font-bold text-emerald-400 uppercase font-mono text-[10px] block">
                Statutory Summary &amp; Key Rules
              </span>
              <ul className="space-y-1.5 text-slate-200">
                {selectedArticle.keyTakeaways.map((k, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{k}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Article Content */}
            <div className="prose prose-invert max-w-none text-xs sm:text-sm text-slate-300 space-y-4 leading-relaxed font-sans whitespace-pre-line">
              {selectedArticle.content}
            </div>

            {/* Action Bottom */}
            <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                onClick={() => setSelectedArticle(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Close Guide
              </button>
              <button
                onClick={() => {
                  setSelectedArticle(null);
                  onLaunchApp();
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <span>Calculate this in 4mula WorkOS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Concierge License Key & Pilot Request Modal */}
      {showLicenseModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-100 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Activate Workspace License</h3>
                  <p className="text-[11px] text-slate-400">Direct concierge activation by Founder Henke</p>
                </div>
              </div>
              <button onClick={() => setShowLicenseModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {/* Feedback alert */}
            {activationFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                  activationFeedback.success
                    ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200'
                    : 'bg-red-950/70 border-red-500 text-red-200'
                }`}
              >
                {activationFeedback.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <X className="w-4 h-4 shrink-0 text-red-400" />}
                <span>{activationFeedback.message}</span>
              </div>
            )}

            {/* Access Request Information */}
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3 text-xs">
              <span className="font-bold text-slate-300 block">
                Request Practice or Company Workspace Access
              </span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                To prevent unauthorized usage and protect client data, access accounts are provisioned directly for verified South African business owners and accounting practitioners.
              </p>

              <div className="space-y-2 pt-1">
                <a
                  href={`mailto:henke@example.com?subject=PayrollZA%20Access%20Pilot%20Request&body=Hi%20Henke,%0A%0AI%20would%20like%20to%20request%20an%20access%20pilot%20for%20PayrollZA.%0A%0ACompany%20Name:%20%0ANumber%20of%20Employees:%20%0AAccountant%20or%20Business%20Owner:%20%0A%0AThanks!`}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-emerald-400" />
                    <span>Email Access Desk (henke@example.com)</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </a>

                <a
                  href={`https://wa.me/?text=Hi%20Henke,%20I'm%20interested%20in%20testing%20PayrollZA%20payroll%20for%20my%20business/practice.%20Please%20send%20me%20pilot%20access%20details.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-emerald-400" />
                    <span>WhatsApp Access Request</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                </a>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => setShowLicenseModal(false)}
                className="px-3 py-1.5 text-slate-400 hover:text-white text-xs"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowLicenseModal(false);
                  onLaunchApp();
                }}
                className="text-xs font-bold text-emerald-400 hover:underline"
              >
                Test drive demo first &rarr;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
