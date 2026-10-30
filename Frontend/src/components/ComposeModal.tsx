import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  UploadCloud,
  CheckCircle2,
  FileText,
  Clock,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Maximize2,
  Minimize2,
  FileIcon,
  Paperclip,
  FileCode,
  Image as ImageIcon,
  Sparkles,
  Send,
  ChevronDown,
  User,
  Users,
  Zap,
} from 'lucide-react';
import { ComposeErrors, ComposeFormState, EmailAttachment } from '../types';
import {
  calculateEstimatedSendTime,
  parseLeadsInput,
  validateComposeForm,
} from '../utils/scheduleCalculator';
import { SAMPLE_COMPOSE_BODY } from '../data/mockData';
import { GmailStylingToolbar } from './GmailStylingToolbar';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (formData: ComposeFormState) => void;
  initialPreset?: 'empty' | 'filled' | 'errors';
  defaultSenderEmail?: string;
  defaultSenderName?: string;
}

const DEFAULT_EMPTY_STATE: ComposeFormState = {
  fromEmail: '',
  fromName: '',
  toEmails: [],
  toInput: '',
  ccEmails: [],
  bccEmails: [],
  subject: '',
  body: '',
  bodyHtml: '',
  fileName: null,
  fileSizeBytes: 0,
  leadCount: 0,
  duplicateCount: 0,
  invalidCount: 0,
  startTime: '',
  delaySeconds: '2',
  hourlyLimit: '200',
  attachments: [],
};

const SAMPLE_ATTACHMENTS: EmailAttachment[] = [
  {
    id: 'att-1',
    name: 'Northwind_Q4_Benchmark_Report.pdf',
    sizeBytes: 1048576 * 2.4, // 2.4 MB
    type: 'pdf',
  },
  {
    id: 'att-2',
    name: 'FinStack_Case_Study_Metrics.png',
    sizeBytes: 420000, // 420 KB
    type: 'image',
  },
];

const FILLED_SAMPLE_STATE: ComposeFormState = {
  fromEmail: 'alex.morgan@gmail.com',
  fromName: 'Alex Morgan',
  toEmails: ['aarav.mehta@northwind.io', 'priya.nair@brightlabs.co'],
  toInput: '',
  ccEmails: [],
  bccEmails: [],
  subject: 'Quick intro: scaling outbound at Northwind',
  body: SAMPLE_COMPOSE_BODY,
  bodyHtml: `<p>Hi {{firstName}},</p><br/><p>I noticed Northwind has been rapidly expanding its outbound sales motion this quarter. Many B2B teams at this stage run into <b>deliverability bottlenecks</b> and fragmented lead sequencing that slow down rep quota attainment.</p><br/><p>We built <b>ReachInbox</b> to automate high-volume personalized scheduling with native deliverability guards and Slack alerting so your pipeline keeps flowing smoothly.</p><br/><p>Would you be open to a 10-minute chat next Tuesday to see how we helped FinStack boost reply rates by <b>34%</b>?</p>`,
  fileName: 'leads-q4.csv',
  fileSizeBytes: 18432, // ~18 KB
  leadCount: 128,
  duplicateCount: 5,
  invalidCount: 3,
  startTime: '2026-10-31T10:00',
  delaySeconds: 2,
  hourlyLimit: 50,
  attachments: SAMPLE_ATTACHMENTS,
};

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onSchedule,
  initialPreset = 'empty',
  defaultSenderEmail = '',
  defaultSenderName = '',
}) => {
  const [form, setForm] = useState<ComposeFormState>(DEFAULT_EMPTY_STATE);
  const [deliveryMode, setDeliveryMode] = useState<'now' | 'schedule'>('now');
  const [errors, setErrors] = useState<ComposeErrors>({});
  const [isScheduling, setIsScheduling] = useState(false);
  const [isDragOverLeads, setIsDragOverLeads] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [ccInput, setCcInput] = useState('');
  const [bccInput, setBccInput] = useState('');

  const leadsFileInputRef = useRef<HTMLInputElement>(null);
  const attachmentFileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  useEffect(() => {
    if (initialPreset === 'filled') {
      setForm(FILLED_SAMPLE_STATE);
      if (editorRef.current) {
        editorRef.current.innerHTML = FILLED_SAMPLE_STATE.bodyHtml || FILLED_SAMPLE_STATE.body;
      }
      setErrors({});
    } else if (initialPreset === 'errors') {
      setForm({
        ...DEFAULT_EMPTY_STATE,
        fromEmail: '',
        toEmails: [],
        toInput: '',
        subject: '',
        fileName: null,
        leadCount: 0,
        hourlyLimit: 0,
      });
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
      setErrors({
        from: 'Sender email (From) is required',
        to: 'Please add at least one recipient email (To) or upload a leads list',
        subject: 'Subject is required',
        hourlyLimit: 'Must be at least 1',
      });
    } else {
      setForm({
        ...DEFAULT_EMPTY_STATE,
        fromEmail: defaultSenderEmail,
        fromName: defaultSenderName,
      });
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
      setErrors({});
    }
    setIsScheduling(false);
  }, [initialPreset, isOpen, defaultSenderEmail, defaultSenderName]);

  // Keep editorRef innerHTML in sync when opening with pre-filled content
  useEffect(() => {
    if (isOpen && editorRef.current && form.bodyHtml) {
      if (editorRef.current.innerHTML !== form.bodyHtml) {
        editorRef.current.innerHTML = form.bodyHtml;
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (field: keyof ComposeFormState, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof ComposeErrors]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field as keyof ComposeErrors];
        return next;
      });
    }
  };

  const handleSenderChange = (email: string) => {
    setForm((prev) => ({
      ...prev,
      fromEmail: email,
      fromName: email.split('@')[0] || 'Sender',
    }));
    if (errors.from) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.from;
        return next;
      });
    }
  };

  // Recipient (To) Handlers
  const addDirectRecipient = (raw: string) => {
    const candidate = raw.trim().replace(/[,;]+$/, '');
    if (!candidate) return;
    if (emailRegex.test(candidate)) {
      if (!form.toEmails.includes(candidate)) {
        setForm((prev) => ({
          ...prev,
          toEmails: [...prev.toEmails, candidate],
          toInput: '',
        }));
        setErrors((prev) => {
          const next = { ...prev };
          delete next.to;
          return next;
        });
      } else {
        setForm((prev) => ({ ...prev, toInput: '' }));
      }
    }
  };

  const handleToKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault();
      addDirectRecipient(form.toInput);
    } else if (e.key === 'Backspace' && !form.toInput && form.toEmails.length > 0) {
      setForm((prev) => ({
        ...prev,
        toEmails: prev.toEmails.slice(0, -1),
      }));
    }
  };

  const handleToBlur = () => {
    if (form.toInput.trim()) {
      addDirectRecipient(form.toInput);
    }
  };

  const handleRemoveToEmail = (index: number) => {
    setForm((prev) => ({
      ...prev,
      toEmails: prev.toEmails.filter((_, i) => i !== index),
    }));
  };

  // CC & BCC handlers
  const addCcEmail = (raw: string) => {
    const candidate = raw.trim().replace(/[,;]+$/, '');
    if (!candidate) return;
    if (emailRegex.test(candidate) && !form.ccEmails.includes(candidate)) {
      setForm((prev) => ({
        ...prev,
        ccEmails: [...prev.ccEmails, candidate],
      }));
      setCcInput('');
    }
  };

  const addBccEmail = (raw: string) => {
    const candidate = raw.trim().replace(/[,;]+$/, '');
    if (!candidate) return;
    if (emailRegex.test(candidate) && !form.bccEmails.includes(candidate)) {
      setForm((prev) => ({
        ...prev,
        bccEmails: [...prev.bccEmails, candidate],
      }));
      setBccInput('');
    }
  };

  const handleInsertSubjectTag = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      subject: prev.subject ? `${prev.subject} ${tag}` : tag,
    }));
    if (errors.subject) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.subject;
        return next;
      });
    }
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      const text = editorRef.current.innerText;
      setForm((prev) => ({
        ...prev,
        bodyHtml: html,
        body: text,
      }));
    }
  };

  const handleExecCommand = (command: string, value: string = '') => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, value);
      handleEditorInput();
    }
  };

  const handleInsertTag = (tag: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(
        'insertHTML',
        false,
        `<span style="background-color: #EFF6FF; color: #1D4ED8; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-family: monospace;">${tag}</span> `
      );
      handleEditorInput();
    } else {
      setForm((prev) => ({
        ...prev,
        body: prev.body + ` ${tag} `,
      }));
    }
  };

  // Leads File Handlers
  const handleLeadsFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || '';
      const parsed = parseLeadsInput(content);
      setForm((prev) => ({
        ...prev,
        fileName: file.name,
        fileSizeBytes: file.size,
        leadCount: parsed.leadCount || 1,
        duplicateCount: parsed.duplicateCount,
        invalidCount: parsed.invalidCount,
      }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next.leads;
        delete next.to;
        return next;
      });
    };
    reader.readAsText(file);
  };

  const handleLeadsDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverLeads(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleLeadsFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveLeadsFile = () => {
    setForm((prev) => ({
      ...prev,
      fileName: null,
      fileSizeBytes: 0,
      leadCount: 0,
      duplicateCount: 0,
      invalidCount: 0,
    }));
    if (leadsFileInputRef.current) leadsFileInputRef.current.value = '';
  };

  // Attachments Handlers
  const handleAddAttachments = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newAttachments: EmailAttachment[] = [];
    Array.from(files).forEach((file) => {
      let type: 'image' | 'pdf' | 'file' = 'file';
      if (file.type.startsWith('image/')) {
        type = 'image';
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        type = 'pdf';
      }

      let previewUrl: string | undefined;
      if (type === 'image') {
        previewUrl = URL.createObjectURL(file);
      }

      newAttachments.push({
        id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        sizeBytes: file.size,
        type,
        previewUrl,
      });
    });

    setForm((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...newAttachments],
    }));
  };

  const handleRemoveAttachment = (id: string) => {
    setForm((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((a) => a.id !== id),
    }));
  };

  const handlePrefillFilled = () => {
    setForm(FILLED_SAMPLE_STATE);
    if (editorRef.current) {
      editorRef.current.innerHTML = FILLED_SAMPLE_STATE.bodyHtml || FILLED_SAMPLE_STATE.body;
    }
    setErrors({});
  };

  const handleSubmitWithMode = (mode: 'now' | 'schedule', e?: React.FormEvent) => {
    if (e) e.preventDefault();

    let updatedForm = { ...form };
    // Auto-commit any typed recipient if user pressed Send without hitting Enter
    if (form.toInput.trim()) {
      const candidate = form.toInput.trim().replace(/[,;]+$/, '');
      if (emailRegex.test(candidate) && !form.toEmails.includes(candidate)) {
        updatedForm = {
          ...form,
          toEmails: [...form.toEmails, candidate],
          toInput: '',
        };
        setForm(updatedForm);
      }
    }

    if (mode === 'now') {
      updatedForm.startTime = new Date().toISOString();
      updatedForm.delaySeconds = 0;
    } else {
      if (!updatedForm.startTime) {
        // Default to 1 minute into future if user didn't pick date/time
        updatedForm.startTime = new Date(Date.now() + 60000).toISOString();
      }
    }

    const validation = validateComposeForm(updatedForm);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsScheduling(true);
    setTimeout(() => {
      setIsScheduling(false);
      onSchedule(updatedForm);
      onClose();
    }, 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    handleSubmitWithMode(deliveryMode, e);
  };

  const directCount = form.toEmails.length;
  const fileCount = form.fileName ? form.leadCount : 0;
  const totalRecipientsCount = directCount + fileCount;

  const delaySec = Number(form.delaySeconds) || 0;
  const hourly = Number(form.hourlyLimit) || 0;
  const durationSummary = calculateEstimatedSendTime(
    Math.max(1, totalRecipientsCount),
    delaySec,
    hourly
  );

  const isFormFilled = Boolean(
    form.fromEmail &&
      form.subject.trim() &&
      (totalRecipientsCount > 0 || form.toInput.trim())
  );
  const hasErrors = Object.keys(errors).length > 0;
  const isScheduleDisabled = isScheduling || !isFormFilled || hasErrors;

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1048576) {
      return `${(bytes / 1048576).toFixed(1)} MB`;
    }
    return `${Math.round(bytes / 1024)} KB`;
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compose-modal-title"
    >
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={leadsFileInputRef}
        accept=".csv,.txt"
        onChange={(e) => e.target.files && handleLeadsFileUpload(e.target.files[0])}
        className="hidden"
      />
      <input
        type="file"
        ref={attachmentFileInputRef}
        multiple
        onChange={(e) => handleAddAttachments(e.target.files)}
        className="hidden"
      />
      <input
        type="file"
        ref={imageFileInputRef}
        accept="image/*"
        multiple
        onChange={(e) => handleAddAttachments(e.target.files)}
        className="hidden"
      />

      {/* Expanded Big Modal Card */}
      <div
        className={`bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col transition-all duration-200 overflow-hidden ${
          isFullscreen
            ? 'w-full h-full fixed inset-0 rounded-none'
            : 'w-full max-w-5xl max-h-[92vh] h-[860px]'
        }`}
      >
        {/* Top Header Bar with window controls */}
        <div className="px-6 py-3.5 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h2 id="compose-modal-title" className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Compose Outbound Campaign</span>
            </h2>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80">
              <Sparkles className="w-3 h-3 text-blue-600" />
              Paced Deliverability Active
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {(!form.subject || form.toEmails.length === 0) && (
              <button
                type="button"
                onClick={handlePrefillFilled}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors mr-2"
              >
                Prefill Sample Campaign
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Restore dialog' : 'Maximize dialog'}
              aria-label={isFullscreen ? 'Restore dialog' : 'Maximize dialog'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {/* Section 1: FROM, TO, CC/BCC, SUBJECT */}
          <div className="p-5 sm:p-6 border-b border-slate-200/80 bg-slate-50/40 space-y-3.5 shrink-0">
            {/* ROW 1: FROM */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="w-20 shrink-0 flex items-center gap-1.5">
                <label htmlFor="compose-from" className="text-xs font-bold text-slate-700 tracking-wide uppercase">
                  From:
                </label>
              </div>
              <div className="flex-1 flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[280px]">
                  <input
                    type="email"
                    id="compose-from"
                    placeholder="Enter sender email (e.g. sender@example.com)"
                    value={form.fromEmail}
                    onChange={(e) => handleSenderChange(e.target.value)}
                    className={`w-full px-3.5 py-2 text-xs sm:text-sm font-semibold bg-white rounded-xl border text-slate-800 transition-all placeholder:text-slate-400 placeholder:font-normal ${
                      errors.from
                        ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                        : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 shadow-2xs'
                    }`}
                  />
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200/70 text-xs font-bold shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Sender Account</span>
                </div>
              </div>
            </div>
            {errors.from && (
              <p className="text-xs text-red-600 ml-0 sm:ml-22 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.from}
              </p>
            )}

            {/* ROW 2: TO */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-2">
              <div className="w-20 shrink-0 pt-2.5 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 tracking-wide uppercase">
                  To:
                </span>
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                  <button
                    type="button"
                    onClick={() => setShowCc(!showCc)}
                    className={`hover:text-blue-600 px-1 py-0.5 rounded transition-colors ${
                      showCc ? 'text-blue-600 bg-blue-50' : ''
                    }`}
                  >
                    Cc
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => setShowBcc(!showBcc)}
                    className={`hover:text-blue-600 px-1 py-0.5 rounded transition-colors ${
                      showBcc ? 'text-blue-600 bg-blue-50' : ''
                    }`}
                  >
                    Bcc
                  </button>
                </div>
              </div>

              {/* Recipient Interactive Chips Box */}
              <div className="flex-1">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOverLeads(true);
                  }}
                  onDragLeave={() => setIsDragOverLeads(false)}
                  onDrop={handleLeadsDrop}
                  onClick={() => toInputRef.current?.focus()}
                  className={`w-full min-h-[46px] p-2 bg-white rounded-xl border flex flex-wrap items-center gap-2 transition-all cursor-text ${
                    isDragOverLeads
                      ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20'
                      : errors.to
                      ? 'border-red-400 bg-red-50/10 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100'
                      : 'border-slate-300 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-500/20 shadow-2xs'
                  }`}
                >
                  {/* Uploaded Leads CSV Chip (if any) */}
                  {form.fileName && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-900 border border-blue-200/90 text-xs font-bold shadow-2xs">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>{form.fileName}</span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-200/70 text-blue-900">
                        {form.leadCount} leads
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveLeadsFile();
                        }}
                        title="Remove uploaded leads"
                        className="p-0.5 rounded text-blue-500 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Direct Recipient Email Chips */}
                  {form.toEmails.map((email, idx) => (
                    <div
                      key={`${email}-${idx}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200/90 text-xs font-semibold shadow-2xs group"
                    >
                      <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold flex items-center justify-center">
                        {email[0]?.toUpperCase() || '@'}
                      </span>
                      <span className="truncate max-w-[220px]">{email}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveToEmail(idx);
                        }}
                        className="p-0.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {/* Typing input */}
                  <input
                    ref={toInputRef}
                    id="compose-to"
                    type="text"
                    value={form.toInput}
                    onChange={(e) => handleInputChange('toInput', e.target.value)}
                    onKeyDown={handleToKeyDown}
                    onBlur={handleToBlur}
                    placeholder={
                      form.toEmails.length === 0 && !form.fileName
                        ? 'Type recipient email and press Enter, or upload CSV list...'
                        : 'Add recipient email...'
                    }
                    className="flex-1 min-w-[190px] text-xs sm:text-sm bg-transparent outline-none placeholder:text-slate-400 text-slate-800 py-1"
                  />

                  {/* Upload Leads CSV Button right inside the To bar */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      leadsFileInputRef.current?.click();
                    }}
                    className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200/90 hover:border-blue-200 text-xs font-bold transition-all shrink-0 shadow-2xs"
                    title="Upload leads CSV or TXT file"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                    <span>Upload Leads (CSV/TXT)</span>
                  </button>
                </div>

                {errors.to && (
                  <p className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.to}
                  </p>
                )}

                {/* Micro Helper & Count */}
                <div className="flex flex-wrap items-center justify-between mt-1.5 px-1 gap-2">
                  <p className="text-[11px] text-slate-500">
                    Type emails separated by <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono">Enter</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono">,</kbd> or drag and drop your CSV leads file.
                  </p>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>
                      {totalRecipientsCount > 0
                        ? `${totalRecipientsCount} recipient${totalRecipientsCount === 1 ? '' : 's'} targeted`
                        : 'No recipients targeted'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Optional ROW: CC */}
            {showCc && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="w-20 shrink-0">
                  <span className="text-xs font-bold text-slate-600 uppercase">Cc:</span>
                </div>
                <div className="flex-1 flex flex-wrap items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  {form.ccEmails.map((email, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-xs text-slate-700"
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            ccEmails: prev.ccEmails.filter((_, i) => i !== idx),
                          }))
                        }
                      >
                        <X className="w-3 h-3 text-slate-400 hover:text-rose-500" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={ccInput}
                    onChange={(e) => setCcInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        addCcEmail(ccInput);
                      }
                    }}
                    placeholder="Add Cc email..."
                    className="flex-1 text-xs outline-none bg-transparent"
                  />
                </div>
              </div>
            )}

            {/* Optional ROW: BCC */}
            {showBcc && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="w-20 shrink-0">
                  <span className="text-xs font-bold text-slate-600 uppercase">Bcc:</span>
                </div>
                <div className="flex-1 flex flex-wrap items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  {form.bccEmails.map((email, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-xs text-slate-700"
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            bccEmails: prev.bccEmails.filter((_, i) => i !== idx),
                          }))
                        }
                      >
                        <X className="w-3 h-3 text-slate-400 hover:text-rose-500" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={bccInput}
                    onChange={(e) => setBccInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        addBccEmail(bccInput);
                      }
                    }}
                    placeholder="Add Bcc email..."
                    className="flex-1 text-xs outline-none bg-transparent"
                  />
                </div>
              </div>
            )}

            {/* ROW 3: SUBJECT */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="w-20 shrink-0">
                <label
                  htmlFor="compose-subject"
                  className="text-xs font-bold text-slate-700 tracking-wide uppercase"
                >
                  Subject:
                </label>
              </div>
              <div className="flex-1 flex flex-col sm:flex-row items-center gap-2">
                <div className="relative flex-1 w-full">
                  <input
                    id="compose-subject"
                    type="text"
                    value={form.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    placeholder="e.g. Quick intro: scaling outbound at Northwind"
                    className={`w-full px-3.5 py-2 text-xs sm:text-sm bg-white rounded-xl border transition-all placeholder:text-slate-400 focus:outline-none ${
                      errors.subject
                        ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                        : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 shadow-2xs'
                    }`}
                  />
                </div>

                {/* Variable Merge Pills for Subject */}
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  <span className="text-[11px] text-slate-400 font-medium">Insert:</span>
                  <button
                    type="button"
                    onClick={() => handleInsertSubjectTag('{{firstName}}')}
                    className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 transition-colors shadow-2xs"
                  >
                    {`{{firstName}}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertSubjectTag('{{company}}')}
                    className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 transition-colors shadow-2xs"
                  >
                    {`{{company}}`}
                  </button>
                </div>
              </div>
            </div>
            {errors.subject && (
              <p className="text-xs text-red-600 ml-0 sm:ml-22 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.subject}
              </p>
            )}
          </div>

          {/* Section 2: Gmail-Style Formatting Toolbar & Rich Writing Canvas */}
          <div className="flex-1 flex flex-col min-h-[280px] border-b border-slate-100">
            {/* Gmail Formatting Menu Bar */}
            <GmailStylingToolbar
              onExecCommand={handleExecCommand}
              onAttachFileClick={() => attachmentFileInputRef.current?.click()}
              onAttachImageClick={() => imageFileInputRef.current?.click()}
              onInsertTag={handleInsertTag}
            />

            {/* Rich Text Editor Body */}
            <div className="flex-1 p-6 relative flex flex-col">
              <div
                ref={editorRef}
                contentEditable
                onInput={handleEditorInput}
                role="textbox"
                aria-multiline="true"
                data-placeholder="Write your email message here... (use toolbar above to format bold, italic, lists, colors, links, or attach files)"
                className="flex-1 w-full outline-none text-slate-800 text-sm leading-relaxed overflow-y-auto min-h-[200px] focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400"
              />
            </div>
          </div>

          {/* Section 3: Attachments Tray (Images, PDFs, Any file) */}
          <div className="px-6 py-3.5 bg-slate-50/50 border-b border-slate-100 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                Attachments ({form.attachments.length})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => attachmentFileInputRef.current?.click()}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                >
                  <FileIcon className="w-3 h-3" />
                  + Attach File / PDF
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => imageFileInputRef.current?.click()}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                >
                  <ImageIcon className="w-3 h-3" />
                  + Insert Image
                </button>
              </div>
            </div>

            {form.attachments.length === 0 ? (
              <div
                onClick={() => attachmentFileInputRef.current?.click()}
                className="border border-dashed border-slate-300 hover:border-blue-400 rounded-xl p-3 text-center cursor-pointer transition-colors bg-white"
              >
                <p className="text-xs text-slate-500">
                  Attach documents, PDFs, pitch decks, or images to include in every outbound send.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {form.attachments.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-2 bg-white border border-slate-200/90 rounded-xl px-3 py-2 shadow-2xs group hover:border-slate-300 transition-all max-w-xs"
                  >
                    {file.type === 'image' ? (
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 overflow-hidden">
                        {file.previewUrl ? (
                          <img
                            src={file.previewUrl}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-4 h-4" />
                        )}
                      </div>
                    ) : file.type === 'pdf' ? (
                      <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 font-bold text-[10px]">
                        PDF
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                        <FileCode className="w-4 h-4" />
                      </div>
                    )}

                    <div className="truncate min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {formatFileSize(file.sizeBytes)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(file.id)}
                      aria-label={`Remove attachment ${file.name}`}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Delivery Settings (Send Now vs Schedule for Later) */}
          <div className="p-5 sm:p-6 bg-slate-50/50 border-b border-slate-100 shrink-0">
            {/* Mode Switcher Buttons */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
                Mode:
              </span>
              <button
                type="button"
                onClick={() => setDeliveryMode('now')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  deliveryMode === 'now'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/25 ring-2 ring-emerald-600/20'
                    : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Send Immediately</span>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryMode('schedule')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  deliveryMode === 'schedule'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 ring-2 ring-blue-600/20'
                    : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Schedule for Later</span>
              </button>
            </div>

            {deliveryMode === 'now' ? (
              <div className="bg-white border border-emerald-100 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5 fill-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Instant Send Active</h4>
                    <p className="text-[11px] text-slate-500">
                      Emails will be queued into BullMQ and dispatched immediately via Ethereal SMTP with zero delay.
                    </p>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 text-emerald-800 font-semibold text-[11px] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Ready to Fire</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Start time */}
                  <div>
                    <label
                      htmlFor="compose-start-time"
                      className="block text-xs font-bold text-slate-800 mb-1.5"
                    >
                      Start time
                    </label>
                    <input
                      id="compose-start-time"
                      type="datetime-local"
                      value={form.startTime}
                      onChange={(e) => handleInputChange('startTime', e.target.value)}
                      className="w-full px-3.5 py-2 text-xs bg-white rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-800 font-mono shadow-2xs"
                    />
                  </div>

                  {/* Delay between emails */}
                  <div>
                    <label
                      htmlFor="compose-delay"
                      className="block text-xs font-bold text-slate-800 mb-1.5"
                    >
                      Delay between emails
                    </label>
                    <div className="relative">
                      <input
                        id="compose-delay"
                        type="number"
                        min="0"
                        value={form.delaySeconds}
                        onChange={(e) => handleInputChange('delaySeconds', e.target.value)}
                        placeholder="2"
                        className="w-full pl-3 pr-16 py-2 text-xs bg-white rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-800 font-mono shadow-2xs"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-medium pointer-events-none">
                        seconds
                      </span>
                    </div>
                  </div>

                  {/* Hourly limit */}
                  <div>
                    <label
                      htmlFor="compose-hourly"
                      className="block text-xs font-bold text-slate-800 mb-1.5"
                    >
                      Hourly limit
                    </label>
                    <div className="relative">
                      <input
                        id="compose-hourly"
                        type="number"
                        min="1"
                        value={form.hourlyLimit}
                        onChange={(e) => handleInputChange('hourlyLimit', e.target.value)}
                        placeholder="200"
                        className={`w-full pl-3 pr-20 py-2 text-xs bg-white rounded-xl border transition-all text-slate-800 font-mono shadow-2xs ${
                          errors.hourlyLimit
                            ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                            : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20'
                        }`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-medium pointer-events-none">
                        emails/hour
                      </span>
                    </div>
                    {errors.hourlyLimit && (
                      <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.hourlyLimit}</p>
                    )}
                  </div>
                </div>

                {/* Summary strip */}
                {totalRecipientsCount > 0 && Number(form.hourlyLimit) > 0 && (
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-3 flex items-center justify-between text-xs shadow-2xs">
                    <div className="flex items-center gap-2 text-slate-800 font-bold">
                      <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{durationSummary.summaryText}</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Warmup & Deliverability Protection Active</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="p-4 px-6 bg-white border-t border-slate-200/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-mono text-[11px]">
                {form.body.length.toLocaleString()} chars
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-[11px]">
                {form.attachments.length} attachment{form.attachments.length === 1 ? '' : 's'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-slate-700">
                From: {form.fromEmail || 'Not set'}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isScheduling}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-2xs transition-colors"
              >
                Discard
              </button>

              {/* Direct Send Now Button (Active only when mode is "now") */}
              <button
                type="button"
                onClick={() => handleSubmitWithMode('now')}
                disabled={isScheduleDisabled || deliveryMode !== 'now'}
                className={`inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm ${
                  deliveryMode !== 'now'
                    ? 'opacity-35 cursor-not-allowed bg-slate-100 text-slate-400 border border-slate-200 shadow-none'
                    : isScheduleDisabled
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25 active:bg-emerald-800'
                }`}
                title={deliveryMode === 'now' ? 'Send email immediately' : 'Select "Send Immediately" mode above to enable'}
              >
                {isScheduling && deliveryMode === 'now' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Zap className={`w-4 h-4 ${deliveryMode === 'now' ? 'fill-white' : 'fill-slate-400'}`} />
                    <span>Send Now</span>
                  </>
                )}
              </button>

              {/* Schedule For Later Button (Active only when mode is "schedule") */}
              <button
                type="button"
                onClick={() => handleSubmitWithMode('schedule')}
                disabled={isScheduleDisabled || deliveryMode !== 'schedule'}
                className={`inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm ${
                  deliveryMode !== 'schedule'
                    ? 'opacity-35 cursor-not-allowed bg-slate-100 text-slate-400 border border-slate-200 shadow-none'
                    : isScheduleDisabled
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/25 active:from-blue-800 active:to-indigo-800'
                }`}
                title={deliveryMode === 'schedule' ? 'Schedule email for chosen time' : 'Select "Schedule for Later" mode above to enable'}
              >
                {isScheduling && deliveryMode === 'schedule' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Scheduling...</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>Schedule</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
