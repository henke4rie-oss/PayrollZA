/*
Top navigation bar.
Shows the four screens and a live badge that tells you whether the Python API is reachable.
*/

import React, { useEffect, useState } from 'react';
import { Calculator, FileText, LayoutDashboard, Users } from 'lucide-react';
import { checkApiHealth } from '../utils/api';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TABS = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'payroll', label: 'Payroll Run', Icon: Calculator },
  { id: 'employees', label: 'Employees & Import', Icon: Users },
  { id: 'sars', label: 'SARS Reports', Icon: FileText },
];

type ApiStatus = { state: 'checking' } | { state: 'online'; database?: string } | { state: 'offline' };

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const [api, setApi] = useState<ApiStatus>({ state: 'checking' });

  // Ping the API's /health endpoint on load, then every 15 seconds
  useEffect(() => {
    let cancelled = false;
    const ping = async () => {
      const result = await checkApiHealth();
      if (cancelled) return;
      setApi(result.online ? { state: 'online', database: result.database } : { state: 'offline' });
    };
    ping();
    const timer = setInterval(ping, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const badge =
    api.state === 'online'
      ? {
          dot: 'bg-emerald-400',
          text: api.database === 'disconnected' ? 'Python API connected (database offline)' : 'Python API connected',
        }
      : api.state === 'offline'
        ? { dot: 'bg-red-500', text: 'Python API offline' }
        : { dot: 'bg-slate-500', text: 'Checking API...' };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center border border-emerald-400/50">
            <span className="font-black text-xl font-mono">P</span>
          </div>
          <div>
            <span className="font-black text-xl tracking-tight">
              Payroll<span className="text-emerald-400">ZA</span>
            </span>
            <p className="text-[10px] text-slate-400 tracking-wide">SARS 2026/27 tax tables</p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-1.5">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all border ${
                activeTab === id
                  ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white border-emerald-400'
                  : 'bg-slate-900/70 text-slate-300 hover:text-white hover:bg-slate-800/90 border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800 border border-slate-700 rounded-full px-3 py-1">
          <span className={`h-2 w-2 rounded-full ${badge.dot}`} />
          <span>{badge.text}</span>
        </div>
      </div>
    </header>
  );
};
