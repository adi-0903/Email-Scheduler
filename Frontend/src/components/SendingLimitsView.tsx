import React from 'react';
import {
  Gauge,
  ShieldCheck,
  Clock,
  Calendar,
  AlertTriangle,
  Zap,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  Plus,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { QuotaData, EmailItem } from '../types';

interface SendingLimitsViewProps {
  quota: QuotaData | null;
  userEmail: string;
  userName: string;
  onRefresh: () => void;
  onComposeClick: () => void;
  userEmails: EmailItem[];
  isLoading?: boolean;
}

export const SendingLimitsView: React.FC<SendingLimitsViewProps> = ({
  quota,
  userEmail,
  userName,
  onRefresh,
  onComposeClick,
  userEmails,
  isLoading = false,
}) => {
  // Compute percentages safely
  const dailyUsed = quota?.daily.used ?? 0;
  const dailyLimit = quota?.daily.limit ?? 100;
  const dailyRemaining = quota?.daily.remaining ?? 100;
  const dailyPercent = Math.min(100, Math.round((dailyUsed / dailyLimit) * 100));

  const weeklyUsed = quota?.weekly.used ?? 0;
  const weeklyLimit = quota?.weekly.limit ?? 500;
  const weeklyRemaining = quota?.weekly.remaining ?? 500;
  const weeklyPercent = Math.min(100, Math.round((weeklyUsed / weeklyLimit) * 100));

  const monthlyUsed = quota?.monthly.used ?? 0;
  const monthlyLimit = quota?.monthly.limit ?? 2000;
  const monthlyRemaining = quota?.monthly.remaining ?? 2000;
  const monthlyPercent = Math.min(100, Math.round((monthlyUsed / monthlyLimit) * 100));

  // Helper for progress bar color
  const getProgressColor = (percent: number) => {
    if (percent >= 90) return 'bg-rose-500';
    if (percent >= 70) return 'bg-amber-500';
    return 'bg-blue-600';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Gauge className="w-4 h-4 stroke-[2.2]" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Outbound Sending Limits & Quota
            </h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Active</span>
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Strictly isolated quotas enforced for <strong className="text-slate-800">{userEmail}</strong>. Prevents domain blacklisting and enforces deliverability warmup.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            title="Refresh current quota count"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : 'text-slate-400'}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={onComposeClick}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Compose Outbound</span>
          </button>
        </div>
      </div>

      {/* 3 Main Quota Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Daily Quota Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs relative overflow-hidden group hover:border-blue-200 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              Daily Limit
            </span>
            <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
              {dailyPercent}% used
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{dailyUsed}</span>
            <span className="text-xs font-medium text-slate-400">/ {dailyLimit} emails sent</span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full ${getProgressColor(dailyPercent)} transition-all duration-500 rounded-full`}
              style={{ width: `${dailyPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span className="font-semibold text-slate-700">{dailyRemaining} sends left today</span>
            <span className="text-slate-400">Resets midnight UTC</span>
          </div>
        </div>

        {/* Weekly Quota Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs relative overflow-hidden group hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              Weekly Limit
            </span>
            <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
              {weeklyPercent}% used
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{weeklyUsed}</span>
            <span className="text-xs font-medium text-slate-400">/ {weeklyLimit} emails sent</span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full ${getProgressColor(weeklyPercent)} transition-all duration-500 rounded-full`}
              style={{ width: `${weeklyPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span className="font-semibold text-slate-700">{weeklyRemaining} sends left this week</span>
            <span className="text-slate-400">Resets Monday 00:00 UTC</span>
          </div>
        </div>

        {/* Monthly Quota Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs relative overflow-hidden group hover:border-purple-200 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
              Monthly Limit
            </span>
            <span className="text-xs font-mono font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
              {monthlyPercent}% used
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{monthlyUsed}</span>
            <span className="text-xs font-medium text-slate-400">/ {monthlyLimit} emails sent</span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full ${getProgressColor(monthlyPercent)} transition-all duration-500 rounded-full`}
              style={{ width: `${monthlyPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span className="font-semibold text-slate-700">{monthlyRemaining} sends left this month</span>
            <span className="text-slate-400">Resets 1st of month</span>
          </div>
        </div>
      </div>

      {/* Deliverability & Rate Pacing Guards */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-bold tracking-tight">Active Anti-Spam & Deliverability Guards</h2>
          </div>
          <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
            Zero Domain Burns
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <p className="text-slate-400 font-medium mb-1">Minimum Send Spacing</p>
            <p className="text-base font-bold text-white">2.0 seconds</p>
            <p className="text-[11px] text-slate-400 mt-1">Prevents bulk blast detection by ESPs</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <p className="text-slate-400 font-medium mb-1">Hourly Sender Limit</p>
            <p className="text-base font-bold text-white">200 emails / hr</p>
            <p className="text-[11px] text-slate-400 mt-1">BullMQ queue auto-paces outbound leads</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <p className="text-slate-400 font-medium mb-1">Worker Concurrency</p>
            <p className="text-base font-bold text-white">5 parallel jobs</p>
            <p className="text-[11px] text-slate-400 mt-1">Controlled background execution</p>
          </div>
        </div>
      </div>

      {/* User's Recent Dispatches (Strictly for this user) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Your Dispatched Emails</h3>
            <p className="text-[11px] text-slate-400">Outbound history sent under {userEmail}</p>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-500">
            {userEmails.length} total records
          </span>
        </div>

        {userEmails.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <Send className="w-6 h-6 stroke-[1.8]" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No outbound emails yet</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
              You haven't scheduled or sent any emails from {userEmail} yet. Your full quota is ready to use!
            </p>
            <button
              type="button"
              onClick={onComposeClick}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Compose First Email</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-6">Recipient</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-6 text-right">Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {userEmails.slice(0, 10).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-slate-800">{item.email}</td>
                    <td className="py-3.5 px-4 text-slate-600 truncate max-w-xs">{item.subject}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'Sent'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                            : item.status === 'Scheduled'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200/70'
                            : 'bg-rose-50 text-rose-700 border border-rose-200/70'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.status === 'Sent'
                              ? 'bg-emerald-600'
                              : item.status === 'Scheduled'
                              ? 'bg-blue-600'
                              : 'bg-rose-600'
                          }`}
                        />
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                      {item.sentTime || item.scheduledTime}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      {item.previewUrl ? (
                        <a
                          href={item.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700"
                        >
                          <span>Ethereal</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-300 font-mono text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
