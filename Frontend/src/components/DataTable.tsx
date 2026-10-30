import React from 'react';
import {
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Calendar,
  Send,
  Plus,
  Building2,
} from 'lucide-react';
import { ActiveTab, EmailItem } from '../types';

interface DataTableProps {
  activeTab: ActiveTab;
  emails: EmailItem[];
  totalCount: number;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onComposeClick: () => void;
  onSwitchToScheduled: () => void;
  onPreviewEmail: (email: EmailItem) => void;
  currentPage: number;
  rowsPerPage: number;
  onPageChange: (newPage: number) => void;
  onRowsPerPageChange: (newLimit: number) => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  activeTab,
  emails,
  totalCount,
  isLoading = false,
  isError = false,
  onRetry,
  onComposeClick,
  onSwitchToScheduled,
  onPreviewEmail,
  currentPage,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
}) => {
  const isSentTab = activeTab === 'sent';

  // 1. Error state
  if (isError) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden p-12 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 stroke-[1.8]" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">Couldn't load emails</h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-6">
          Something went wrong while fetching your emails.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Try again
        </button>
      </div>
    );
  }

  // 2. Empty state
  if (!isLoading && emails.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden p-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 border border-slate-200/60 flex items-center justify-center mx-auto mb-4 shadow-2xs">
          {isSentTab ? (
            <Send className="w-7 h-7 stroke-[1.5]" />
          ) : (
            <Calendar className="w-7 h-7 stroke-[1.5]" />
          )}
        </div>

        {isSentTab ? (
          <>
            <h3 className="text-base font-bold text-slate-900 mb-1">No sent emails yet</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-6">
              Once your scheduled emails go out, they'll appear here with their delivery status.
            </p>
            <button
              type="button"
              onClick={onSwitchToScheduled}
              className="inline-flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              View scheduled emails
            </button>
          </>
        ) : (
          <>
            <h3 className="text-base font-bold text-slate-900 mb-1">No scheduled emails</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-6">
              Emails you schedule will show up here with their send time and status.
            </p>
            <button
              type="button"
              onClick={onComposeClick}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs shadow-blue-500/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Compose New Email</span>
            </button>
          </>
        )}
      </div>
    );
  }

  // 3. Normal / Populated or Skeleton Loading state
  const startItem = (currentPage - 1) * rowsPerPage + 1;
  const endItem = Math.min(startItem + (emails.length || rowsPerPage) - 1, totalCount);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          {/* Sticky Header Row */}
          <thead className="bg-slate-50/90 sticky top-0 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none z-10 backdrop-blur-xs">
            <tr>
              <th scope="col" className="py-3.5 pl-6 pr-4 font-bold">
                Recipient / Lead
              </th>
              <th scope="col" className="py-3.5 px-4 font-bold">
                Subject
              </th>
              <th scope="col" className="py-3.5 px-4 font-bold whitespace-nowrap">
                {isSentTab ? 'Sent time' : 'Scheduled time'}
              </th>
              <th scope="col" className="py-3.5 px-4 font-bold">
                Status
              </th>
              {isSentTab && (
                <th scope="col" className="py-3.5 pl-4 pr-6 font-bold text-right">
                  Preview
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
            {isLoading
              ? // Shimmer skeleton rows of varied widths
                Array.from({ length: 8 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="animate-pulse">
                    <td className="py-4 pl-6 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-200 shrink-0" />
                        <div className="space-y-1.5 w-full">
                          <div className="h-4 bg-slate-200 rounded w-44" />
                          <div className="h-3 bg-slate-100 rounded w-24" />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div
                        className="h-4 bg-slate-200 rounded"
                        style={{ width: `${55 + ((idx * 7) % 35)}%` }}
                      />
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="h-4 bg-slate-200 rounded w-36" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-6 bg-slate-200 rounded-full w-24" />
                    </td>
                    {isSentTab && (
                      <td className="py-4 pl-4 pr-6 text-right">
                        <div className="h-4 bg-slate-200 rounded w-5 ml-auto" />
                      </td>
                    )}
                  </tr>
                ))
              : emails.map((item) => {
                  const initials =
                    item.avatarText ||
                    item.email.slice(0, 2).toUpperCase();

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-default"
                    >
                      {/* Email & Company Column */}
                      <td className="py-3.5 pl-6 pr-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/80 text-slate-700 font-bold text-[11px] flex items-center justify-center shrink-0 group-hover:bg-blue-50 group-hover:text-blue-700 group-hover:border-blue-200 transition-colors">
                            {initials}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {item.email}
                            </p>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                              <span>{item.company || 'Enterprise Lead'}</span>
                              {item.tag && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span>{item.tag}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Subject Column */}
                      <td className="py-3.5 px-4 text-slate-700 max-w-sm truncate" title={item.subject}>
                        <span className="font-medium text-slate-800">{item.subject}</span>
                      </td>

                      {/* Time Column with Tabular Numbers */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-xs tabular-nums text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-200/60">
                          {isSentTab ? item.sentTime : item.scheduledTime}
                        </span>
                      </td>

                      {/* Status Badge Column */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div>
                          {item.status === 'Scheduled' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/70">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                              Scheduled
                            </span>
                          )}

                          {item.status === 'Sent' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              Sent
                            </span>
                          )}

                          {item.status === 'Failed' && (
                            <div className="flex flex-col items-start">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/70">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                                Failed
                              </span>
                              {item.failedReason && (
                                <span className="text-[11px] text-slate-500 mt-1 font-normal flex items-center gap-1">
                                  {item.failedReason}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Preview Action (Sent tab only) */}
                      {isSentTab && (
                        <td className="py-3.5 pl-4 pr-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.previewUrl && (
                              <a
                                href={item.previewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open Live Rendered Email on Ethereal"
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-lg transition-colors shadow-2xs"
                              >
                                <span>Ethereal</span>
                                <ExternalLink className="w-3 h-3 text-indigo-500" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => onPreviewEmail(item)}
                              title="Preview email details"
                              aria-label={`Preview email sent to ${item.email}`}
                              className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!isLoading && (
        <div className="border-t border-slate-200/80 px-6 py-3.5 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold text-slate-800">{startItem}-{endItem}</span> of{' '}
            <span className="font-semibold text-slate-800">{totalCount}</span> emails
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="rows-select" className="text-slate-500">Rows per page:</label>
              <select
                id="rows-select"
                value={rowsPerPage}
                onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
                className="bg-white border border-slate-300 text-slate-700 rounded-lg py-1 px-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value={8}>8</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                aria-label="Previous page"
                className="p-1 rounded-md text-slate-600 hover:bg-slate-200/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-semibold text-slate-700">Page {currentPage}</span>
              <button
                type="button"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={endItem >= totalCount}
                aria-label="Next page"
                className="p-1 rounded-md text-slate-600 hover:bg-slate-200/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
