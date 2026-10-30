export type EmailStatus = 'Scheduled' | 'Sent' | 'Failed';

export interface EmailItem {
  id: string;
  email: string;
  company?: string;
  avatarText?: string;
  tag?: string;
  subject: string;
  scheduledTime?: string;
  sentTime?: string;
  status: EmailStatus;
  failedReason?: string;
  bodySnippet?: string;
  previewUrl?: string;
}

export interface EmailAttachment {
  id: string;
  name: string;
  sizeBytes: number;
  type: 'image' | 'pdf' | 'file';
  previewUrl?: string;
}

export interface ComposeFormState {
  fromEmail: string;
  fromName: string;
  toEmails: string[];
  toInput: string;
  ccEmails: string[];
  bccEmails: string[];
  subject: string;
  body: string;
  bodyHtml?: string;
  fileName: string | null;
  fileSizeBytes?: number;
  leadCount: number;
  duplicateCount: number;
  invalidCount: number;
  startTime: string; // ISO string or format
  delaySeconds: number | string;
  hourlyLimit: number | string;
  attachments: EmailAttachment[];
}

export interface ComposeErrors {
  from?: string;
  to?: string;
  subject?: string;
  leads?: string;
  hourlyLimit?: string;
  delaySeconds?: string;
}

export type ActiveTab = 'scheduled' | 'sent' | 'limits';

export interface QuotaPeriod {
  used: number;
  limit: number;
  remaining: number;
  resetsAt: string;
}

export interface QuotaData {
  sender: string;
  daily: QuotaPeriod;
  weekly: QuotaPeriod;
  monthly: QuotaPeriod;
  pacing: {
    minDelaySeconds: number;
    maxPerHour: number;
  };
}

export interface ToastItem {
  id: string;
  type: 'success' | 'error';
  message: string;
}
