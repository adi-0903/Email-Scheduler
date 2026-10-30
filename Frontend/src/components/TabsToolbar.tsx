import React from 'react';
import { Search, Plus, Calendar, Send } from 'lucide-react';
import { ActiveTab } from '../types';

interface TabsToolbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  scheduledCount: number;
  sentCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onComposeClick: () => void;
  isLoading?: boolean;
}

export const TabsToolbar: React.FC<TabsToolbarProps> = ({
  activeTab,
  onTabChange,
  scheduledCount,
  sentCount,
  searchQuery,
  onSearchChange,
  onComposeClick,
  isLoading = false,
}) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-4 mb-2">
      {/* Segmented Tabs */}
      <div className="bg-slate-100/90 p-1 rounded-xl flex items-center gap-1 border border-slate-200/60 w-fit">
        <button
          type="button"
          onClick={() => onTabChange('scheduled')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            activeTab === 'scheduled'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          <span>Scheduled Emails</span>
          {isLoading ? (
            <span className="inline-block w-8 h-4.5 bg-slate-200 rounded-full animate-pulse" />
          ) : (
            <span
              className={`text-xs px-2 py-0.5 rounded-md font-mono tabular-nums font-bold ${
                activeTab === 'scheduled'
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-slate-200/70 text-slate-600'
              }`}
            >
              {scheduledCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onTabChange('sent')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            activeTab === 'sent'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Send className="w-3.5 h-3.5 text-emerald-600" />
          <span>Sent Emails</span>
          {isLoading ? (
            <span className="inline-block w-8 h-4.5 bg-slate-200 rounded-full animate-pulse" />
          ) : (
            <span
              className={`text-xs px-2 py-0.5 rounded-md font-mono tabular-nums font-bold ${
                activeTab === 'sent'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-slate-200/70 text-slate-600'
              }`}
            >
              {sentCount}
            </span>
          )}
        </button>
      </div>

      {/* Toolbar: Search & Primary Action */}
      <div className="flex items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by email, subject or content"
            className="w-full pl-9 pr-12 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 p-0.5 font-bold"
            >
              ✕
            </button>
          ) : (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 border border-slate-200 bg-slate-50 px-1.5 py-0.5 rounded">
              ⌘K
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onComposeClick}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800 rounded-xl transition-all shadow-sm shadow-blue-500/25 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Compose New Email</span>
        </button>
      </div>
    </div>
  );
};
