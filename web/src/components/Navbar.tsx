/*
"""
Top Navigation Bar & Tenant Switcher
Provides:
- Active Tenant / Workspace selector with instant switching
- Role Switcher (Owner, Payroll Officer, Auditor) for quick testing and RBAC validation
- Subscription Tier badge with direct upgrade CTA
- Navigation across Dashboard, Payroll, Employees, SARS Compliance, Security & Billing
"""
*/

import React from 'react';
import {
  Building2,
  ShieldCheck,
  CreditCard,
  Users,
  Calculator,
  FileText,
  Lock,
  ChevronDown,
  Sparkles,
  Server,
  BookOpen,
} from 'lucide-react';
import { Tenant, User, UserRole } from '../types';
import { DEMO_USERS, SUBSCRIPTION_PLANS } from '../utils/storage';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  tenants: Tenant[];
  activeTenant: Tenant;
  onSelectTenant: (tenantId: string) => void;
  currentUser: User;
  currentUserRole: UserRole;
  onChangeUserRole: (user: User, role: UserRole) => void;
  onOpenLandingPage?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  tenants,
  activeTenant,
  onSelectTenant,
  currentUser,
  currentUserRole,
  onChangeUserRole,
  onOpenLandingPage,
}) => {
  // # Find current plan details
  const currentPlan = SUBSCRIPTION_PLANS.find((p) => p.id === activeTenant.tier) || SUBSCRIPTION_PLANS[0];

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      {/* Top Banner: Statutory & Tax Compliance Notice */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-indigo-950/80 px-4 py-1.5 text-xs text-slate-300 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-emerald-400">SARS 2026/2027 Tax Engine Active</span>
          <span className="text-slate-600">•</span>
          <span className="hidden sm:inline text-slate-400">Income Tax Act • UICA • SDLA • BCEA • POPIA</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="hidden md:inline font-mono text-[11px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 border border-slate-700">
            Tax Year 2026/2027
          </span>
          <span className="flex items-center gap-1 font-medium text-slate-300">
            <span>🇿🇦</span>
            <span>South Africa</span>
          </span>
        </div>
      </div>

      {/* Main Nav Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo & Tenant Switcher */}
          <div className="flex items-center gap-4">
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => setActiveTab('dashboard')}
            >
              {/* Stylized 4mula Logo Icon */}
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-950/80 border border-emerald-400/50 group-hover:border-emerald-300 transition-colors">
                <span className="font-black text-xl text-white tracking-tighter font-mono">4</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-xl tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                    4<span className="text-emerald-400">mula</span>
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    WorkOS
                  </span>
                </div>
                <p className="text-[10px] font-medium text-slate-400 hidden sm:block tracking-wide">
                  People, Payroll &amp; Compliance
                </p>
              </div>
            </div>

            {/* Tenant / Workspace Selector Dropdown */}
            <div className="relative pl-3 border-l border-slate-700 hidden md:block">
              <label htmlFor="tenant-select" className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Workspace (Tenant)
              </label>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <select
                  id="tenant-select"
                  value={activeTenant.id}
                  onChange={(e) => onSelectTenant(e.target.value)}
                  className="bg-slate-800 text-sm font-semibold text-slate-100 border border-slate-700 rounded-md py-1 pl-2 pr-7 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer max-w-[210px] truncate"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Nav Tabs - Distinct Noticeable Segmented Boxes */}
          <nav className="hidden lg:flex items-center gap-1.5 bg-slate-950/95 border border-slate-800/90 p-1.5 rounded-2xl shadow-lg shadow-black/30 backdrop-blur-md">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white border border-emerald-400 shadow-md shadow-emerald-950/60 ring-1 ring-emerald-300/30'
                  : 'bg-slate-900/70 text-slate-300 hover:text-white hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 shadow-sm'
              }`}
            >
              <div className={`p-1 rounded-md ${activeTab === 'dashboard' ? 'bg-white/20' : 'bg-slate-800'}`}>
                <Calculator className="w-3.5 h-3.5" />
              </div>
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('payroll')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'payroll'
                  ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white border border-emerald-400 shadow-md shadow-emerald-950/60 ring-1 ring-emerald-300/30'
                  : 'bg-slate-900/70 text-slate-300 hover:text-white hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 shadow-sm'
              }`}
            >
              <div className={`p-1 rounded-md ${activeTab === 'payroll' ? 'bg-white/20' : 'bg-slate-800'}`}>
                <Calculator className="w-3.5 h-3.5" />
              </div>
              <span>Payroll Run</span>
            </button>

            <button
              onClick={() => setActiveTab('employees')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'employees'
                  ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white border border-emerald-400 shadow-md shadow-emerald-950/60 ring-1 ring-emerald-300/30'
                  : 'bg-slate-900/70 text-slate-300 hover:text-white hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 shadow-sm'
              }`}
            >
              <div className={`p-1 rounded-md ${activeTab === 'employees' ? 'bg-white/20' : 'bg-slate-800'}`}>
                <Users className="w-3.5 h-3.5" />
              </div>
              <span>Employees &amp; Import</span>
            </button>

            <button
              onClick={() => setActiveTab('sars')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'sars'
                  ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white border border-emerald-400 shadow-md shadow-emerald-950/60 ring-1 ring-emerald-300/30'
                  : 'bg-slate-900/70 text-slate-300 hover:text-white hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 shadow-sm'
              }`}
            >
              <div className={`p-1 rounded-md ${activeTab === 'sars' ? 'bg-white/20' : 'bg-slate-800'}`}>
                <FileText className="w-3.5 h-3.5" />
              </div>
              <span>SARS Compliance</span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'security'
                  ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white border border-emerald-400 shadow-md shadow-emerald-950/60 ring-1 ring-emerald-300/30'
                  : 'bg-slate-900/70 text-slate-300 hover:text-white hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 shadow-sm'
              }`}
            >
              <div className={`p-1 rounded-md ${activeTab === 'security' ? 'bg-white/20' : 'bg-slate-800'}`}>
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <span>Security &amp; POPIA</span>
            </button>

            <button
              onClick={() => setActiveTab('billing')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'billing'
                  ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white border border-emerald-400 shadow-md shadow-emerald-950/60 ring-1 ring-emerald-300/30'
                  : 'bg-slate-900/70 text-slate-300 hover:text-white hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 shadow-sm'
              }`}
            >
              <div className={`p-1 rounded-md ${activeTab === 'billing' ? 'bg-white/20' : 'bg-slate-800'}`}>
                <CreditCard className="w-3.5 h-3.5" />
              </div>
              <span>Subscription</span>
            </button>
          </nav>

          {/* Right Action Cluster: Prominent Noticeable Boxes */}
          <div className="flex items-center gap-2.5">
            {/* Subscription Tier Box */}
            <button
              onClick={() => setActiveTab('billing')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/40 hover:border-amber-400 shadow-md shadow-amber-950/20 transition-all hover:scale-[1.02]"
            >
              <div className="p-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <div className="text-[10px] uppercase tracking-wider text-amber-400/90 font-mono">Plan</div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white text-xs">{currentPlan.name.split(' ')[0]}</span>
                  {currentPlan.priceZAR === 0 ? (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/30 font-mono">Free</span>
                  ) : (
                    <span className="text-[10px] bg-amber-500/20 text-amber-200 px-1.5 py-0.2 rounded border border-amber-500/30 font-mono">R{currentPlan.priceZAR}</span>
                  )}
                </div>
              </div>
            </button>

            {/* Role Tester / Switcher Box */}
            <div className="relative">
              <label htmlFor="role-select" className="sr-only">Switch User Role</label>
              <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-xl py-1.5 px-3 shadow-md shadow-black/20 hover:border-slate-600 transition-colors">
                <div className="p-1 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  <Lock className="w-3 h-3" />
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-slate-400 font-mono">Simulated Role</div>
                  <select
                    id="role-select"
                    aria-label="Switch User Role"
                    value={`${currentUser.id}|${currentUserRole}`}
                    onChange={(e) => {
                      const [userId, role] = e.target.value.split('|');
                      const targetUser = DEMO_USERS.find((u) => u.id === userId) || DEMO_USERS[0];
                      onChangeUserRole(targetUser, role as UserRole);
                    }}
                    className="bg-transparent text-xs font-bold text-slate-100 focus:outline-none cursor-pointer pr-1"
                  >
                    <option value="user-henke|owner">Henke (Owner / Founder)</option>
                    <option value="user-sarah|payroll_officer">Sarah (Payroll Officer)</option>
                    <option value="user-david|auditor">David (SARS Auditor)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Public Landing & SEO Knowledge Hub Button */}
            {onOpenLandingPage && (
              <button
                onClick={onOpenLandingPage}
                className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900/90 hover:bg-slate-800 text-emerald-400 border border-emerald-500/40 hover:border-emerald-400 shadow-md transition-all hover:scale-[1.02]"
                title="View Public Landing Page & SARS Tax Guides"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Tax Hub &amp; Blog</span>
              </button>
            )}
          </div>
        </div>

        {/* Focused Element: Mobile/Tablet Sub-Navigation Bar with Noticeable Segmented Boxes */}
        <div className="flex lg:hidden items-center border border-slate-800 bg-slate-950/95 p-2 overflow-x-auto gap-2 text-xs rounded-2xl my-2.5 shadow-xl shadow-black/40 ring-1 ring-white/5">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap font-bold text-xs transition-all shrink-0 ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white border border-emerald-400 shadow-md shadow-emerald-950/60 ring-1 ring-emerald-300/30'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 shadow-sm'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab('payroll')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap font-bold text-xs transition-all shrink-0 ${
              activeTab === 'payroll'
                ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white border border-emerald-400 shadow-md shadow-emerald-950/60 ring-1 ring-emerald-300/30'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 shadow-sm'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Payroll Run</span>
          </button>
          <button
            onClick={() => setActiveTab('employees')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap font-bold text-xs transition-all shrink-0 ${
              activeTab === 'employees'
                ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white border border-emerald-400 shadow-md shadow-emerald-950/60 ring-1 ring-emerald-300/30'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 shadow-sm'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Employees</span>
          </button>
          <button
            onClick={() => setActiveTab('sars')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap font-bold text-xs transition-all shrink-0 ${
              activeTab === 'sars'
                ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white border border-emerald-400 shadow-md shadow-emerald-950/60 ring-1 ring-emerald-300/30'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 shadow-sm'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>SARS (EMP201)</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap font-bold text-xs transition-all shrink-0 ${
              activeTab === 'security'
                ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white border border-emerald-400 shadow-md shadow-emerald-950/60 ring-1 ring-emerald-300/30'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 shadow-sm'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Security &amp; POPIA</span>
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap font-bold text-xs transition-all shrink-0 ${
              activeTab === 'billing'
                ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white border border-emerald-400 shadow-md shadow-emerald-950/60 ring-1 ring-emerald-300/30'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 shadow-sm'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Subscription</span>
          </button>
        </div>
      </div>
    </header>
  );
};
