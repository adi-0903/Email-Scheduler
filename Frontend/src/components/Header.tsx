import React from 'react';
import { LogOut, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  userName?: string;
  userEmail?: string;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userName = 'Alex Morgan',
  userEmail = 'alex.morgan@gmail.com',
  onLogout,
}) => {
  const initials =
    userName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'AM';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="px-6 h-14 flex items-center justify-between">
        {/* Left: Breadcrumbs & Health Badge */}
        <div className="flex items-center gap-4">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className="hover:text-slate-800 transition-colors">Campaigns</span>
            <span className="text-slate-300">/</span>
            <span className="hover:text-slate-800 transition-colors">Q4 Outbound</span>
            <span className="text-slate-300">/</span>
            <span className="font-bold text-slate-900">Email Outbox</span>
          </nav>

          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-700">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Health 99.4%</span>
          </div>
        </div>

        {/* Right side: Clean, lightweight user profile */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-xs ring-1 ring-slate-200">
                {initials}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
            </div>

            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-800 leading-tight">{userName}</p>
              <p className="text-[10px] text-slate-400 leading-tight">{userEmail}</p>
            </div>

            <button
              type="button"
              onClick={onLogout}
              aria-label="Logout"
              title="Log out"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
