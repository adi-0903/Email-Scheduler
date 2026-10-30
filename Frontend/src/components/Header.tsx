import React, { useState, useRef, useEffect } from 'react';
import { LogOut, ChevronDown, Check, Slack, ShieldCheck, Layers, ExternalLink } from 'lucide-react';

interface HeaderProps {
  userName?: string;
  userEmail?: string;
  isSlackConnected: boolean;
  onToggleSlack: (connected: boolean) => void;
  onLogout: () => void;
  onOpenBackendEngine?: () => void;
  isBackendConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  userName = 'Alex Morgan',
  userEmail = 'alex.morgan@gmail.com',
  isSlackConnected,
  onToggleSlack,
  onLogout,
  onOpenBackendEngine,
  isBackendConnected = false,
}) => {
  const [slackDropdownOpen, setSlackDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setSlackDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials =
    userName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'AM';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="px-6 h-16 flex items-center justify-between">
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

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* BullMQ Dashboard Link */}
          <a
            href="http://localhost:4000/admin/queues"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-all border border-indigo-200 shadow-2xs"
            title="Open Live BullMQ Queue Dashboard"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">BullMQ Dashboard</span>
            <ExternalLink className="w-3 h-3 text-indigo-400" />
          </a>

          {/* Real-time Backend Engine Button */}
          {onOpenBackendEngine && (
            <button
              type="button"
              onClick={onOpenBackendEngine}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-all border border-slate-700 hover:border-slate-600"
              title="Configure real-time backend API & WebSockets"
            >
              <span className={`w-2 h-2 rounded-full ${isBackendConnected ? 'bg-emerald-400 ring-2 ring-emerald-400/40' : 'bg-amber-400 animate-pulse'}`} />
              <span className="hidden sm:inline">Real-Time Backend</span>
              <span className="sm:hidden">Backend</span>
            </button>
          )}
          {/* Slack Integration Control */}
          <div className="relative" ref={dropdownRef}>
            {isSlackConnected ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSlackDropdownOpen(!slackDropdownOpen)}
                  aria-expanded={slackDropdownOpen}
                  aria-haspopup="true"
                  className="inline-flex items-center gap-2.5 px-4 py-2 sm:px-4.5 sm:py-2 text-xs sm:text-sm font-bold text-slate-800 bg-white hover:bg-slate-50 border border-emerald-300 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 animate-pulse" />
                  <span className="font-bold text-slate-900">Slack connected</span>
                  <span className="text-emerald-700 font-mono text-xs bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80">#alerts</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
                </button>

                {slackDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40 animate-in fade-in slide-in-from-top-1">
                    <div className="px-3.5 py-2 border-b border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Channel</p>
                      <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> #alerts active
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onToggleSlack(false);
                        setSlackDropdownOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center justify-between font-semibold transition-colors"
                    >
                      <span>Disconnect Slack</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative group">
                {/* Vibrant pulsing glow aura */}
                <div className="absolute -inset-1.5 bg-gradient-to-r from-[#E01E5A] via-[#ECB22E] to-[#2EB67D] rounded-2xl blur-lg opacity-85 group-hover:opacity-100 transition duration-300 animate-pulse" />

                <button
                  type="button"
                  onClick={() => onToggleSlack(true)}
                  className="relative inline-flex items-center gap-2.5 px-5 py-2.5 sm:px-6 sm:py-2.5 text-xs sm:text-sm font-bold text-slate-900 bg-white hover:bg-slate-50 active:bg-slate-100 border border-rose-300/80 rounded-xl transition-all shadow-[0_0_20px_rgba(224,30,90,0.3)] hover:shadow-[0_0_28px_rgba(224,30,90,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 select-none cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  {/* Multicolor Slack Logo */}
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
                    <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
                    <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/>
                    <path d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E"/>
                  </svg>
                  <span className="tracking-tight text-slate-900 font-extrabold">Connect Slack</span>
                  <span className="relative flex h-2.5 w-2.5 ml-0.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-slate-200" />

          {/* User Profile Block */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-xs ring-1 ring-slate-200">
                {initials}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
            </div>

            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-800 leading-tight">{userName}</p>
              <p className="text-[11px] text-slate-500 leading-tight">{userEmail}</p>
            </div>

            {/* Logout control */}
            <button
              type="button"
              onClick={onLogout}
              aria-label="Logout"
              title="Log out of ReachInbox"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
