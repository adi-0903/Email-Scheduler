import React from 'react';
import {
  Send,
  Calendar,
  ChevronDown,
  CheckCircle2,
  Mail,
  LogOut,
} from 'lucide-react';
import { ActiveTab } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  scheduledCount: number;
  sentCount: number;
  isSlackConnected: boolean;
  onToggleSlack: (connected: boolean) => void;
  userName: string;
  userEmail: string;
  onLogout: () => void;
  onComposeClick: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  scheduledCount,
  sentCount,
  isSlackConnected,
  onToggleSlack,
  userName,
  userEmail,
  onLogout,
  onComposeClick,
}) => {
  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 select-none">
      {/* Top Header / Workspace */}
      <div>
        {/* Brand header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/25">
              <Mail className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold tracking-tight text-slate-900">Reach</span>
                <span className="text-lg font-medium tracking-tight text-blue-600">Inbox</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60 ml-0.5">
                  PRO
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Workspace Switcher */}
        <div className="px-4 py-3 border-b border-slate-100/80">
          <button
            type="button"
            className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 transition-colors text-left"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 shrink-0" />
              <div className="truncate">
                <p className="text-xs font-bold text-slate-800 truncate">Northwind Outbound</p>
                <p className="text-[10px] text-slate-400 font-medium">Production · 6 Inboxes</p>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>
        </div>

        {/* Navigation Section */}
        <div className="px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Outbound Engine
          </div>

          {/* Scheduled Emails tab */}
          <button
            type="button"
            onClick={() => onSelectTab('scheduled')}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'scheduled'
                ? 'bg-blue-50 text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Calendar className={`w-4 h-4 ${activeTab === 'scheduled' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>Scheduled Emails</span>
            </div>
            <span
              className={`text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-full ${
                activeTab === 'scheduled'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 font-medium'
              }`}
            >
              {scheduledCount}
            </span>
          </button>

          {/* Sent Emails tab */}
          <button
            type="button"
            onClick={() => onSelectTab('sent')}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'sent'
                ? 'bg-blue-50 text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Send className={`w-4 h-4 ${activeTab === 'sent' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>Sent Emails</span>
            </div>
            <span
              className={`text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-full ${
                activeTab === 'sent'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 font-medium'
              }`}
            >
              {sentCount}
            </span>
          </button>

        </div>
      </div>

      {/* Bottom Section: Slack and User */}
      <div className="p-4 border-t border-slate-100 space-y-3 bg-slate-50/50">

        {/* Slack Connection pill */}
        <div>
          {isSlackConnected ? (
            <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs text-emerald-800 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200 animate-pulse" />
                <span className="font-bold text-[11px]">#alerts synced</span>
              </div>
              <button
                type="button"
                onClick={() => onToggleSlack(false)}
                className="text-[11px] text-rose-600 hover:underline font-semibold"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#E01E5A] via-[#ECB22E] to-[#2EB67D] rounded-xl blur-md opacity-80 group-hover:opacity-100 transition duration-300 animate-pulse" />
              <button
                type="button"
                onClick={() => onToggleSlack(true)}
                className="relative w-full flex items-center justify-center gap-2.5 py-2.5 px-3 bg-white hover:bg-slate-50 active:bg-slate-100 border border-rose-200/80 rounded-xl text-xs font-bold text-slate-900 transition-all shadow-[0_0_15px_rgba(224,30,90,0.25)] hover:shadow-[0_0_20px_rgba(224,30,90,0.4)]"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/>
                  <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/>
                  <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D"/>
                  <path d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E"/>
                </svg>
                <span>Connect Slack</span>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              </button>
            </div>
          )}
        </div>

        {/* User Card */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-2xs">
                {userName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2) || 'AM'}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-800 truncate">{userName}</p>
              <p className="text-[10px] text-slate-400 truncate">{userEmail}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            title="Log out"
            aria-label="Log out"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
