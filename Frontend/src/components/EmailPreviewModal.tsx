import React from 'react';
import { X, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { EmailItem } from '../types';

interface EmailPreviewModalProps {
  email: EmailItem | null;
  onClose: () => void;
}

export const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({ email, onClose }) => {
  if (!email) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 id="preview-modal-title" className="text-base font-bold text-slate-900">
              Email Delivery Preview
            </h2>
            {email.status === 'Sent' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" /> Sent
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                <AlertTriangle className="w-3 h-3" /> Failed
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/70 space-y-2 text-xs">
            <div className="flex">
              <span className="w-20 font-medium text-slate-400">To:</span>
              <span className="font-semibold text-slate-800">{email.email}</span>
            </div>
            <div className="flex">
              <span className="w-20 font-medium text-slate-400">Subject:</span>
              <span className="font-semibold text-slate-800">{email.subject}</span>
            </div>
            <div className="flex">
              <span className="w-20 font-medium text-slate-400">Timestamp:</span>
              <span className="font-mono text-slate-600">{email.sentTime || email.scheduledTime}</span>
            </div>
            {email.failedReason && (
              <div className="flex items-center text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200 mt-2">
                <span className="font-semibold mr-1.5">Failure reason:</span>
                <span>{email.failedReason}</span>
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Message Content
            </p>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs sm:text-sm text-slate-700 leading-relaxed font-sans whitespace-pre-line">
              {email.bodySnippet ||
                `Hi there,

I noticed your team has been rapidly expanding your outbound sales motion this quarter. Many B2B teams at this stage run into deliverability bottlenecks and fragmented lead sequencing that slow down rep quota attainment.

We built ReachInbox to automate high-volume personalized scheduling with native deliverability guards and Slack alerting so your pipeline keeps flowing smoothly.

Best regards,
Alex Morgan`}
            </div>
          </div>
        </div>

        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          {email.previewUrl ? (
            <a
              href={email.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/90 rounded-xl transition-all shadow-2xs"
            >
              <span>Open in Ethereal Mailbox</span>
              <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
            </a>
          ) : (
            <span className="text-[11px] text-slate-400 font-medium">Delivered via Ethereal SMTP</span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-2xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
