import React from 'react';
import { Clock, Send, ShieldCheck, MailCheck, TrendingUp } from 'lucide-react';

interface MetricCardsProps {
  scheduledCount: number;
  sentCount: number;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  scheduledCount,
  sentCount,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Scheduled Queue */}
      <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500">Queued for Delivery</span>
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
            {scheduledCount}
          </span>
          <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
            Paced
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Starting Oct 31, 10:00 AM</p>
      </div>

      {/* 2. Total Sent */}
      <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500">Sent Outbound</span>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Send className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
            {sentCount}
          </span>
          <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" /> 98.2%
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Last blast: Oct 30, 9:00 AM</p>
      </div>

      {/* 3. Hourly Throughput */}
      <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500">Pacing Speed</span>
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <MailCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
            50
          </span>
          <span className="text-xs text-slate-500 font-medium">emails / hour</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">2-minute spacing delay</p>
      </div>

      {/* 4. Deliverability Health */}
      <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500">Deliverability Health</span>
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
            99.4%
          </span>
          <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
            Optimal
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">SPF, DKIM, DMARC active</p>
      </div>
    </div>
  );
};
