import { ComposeErrors, ComposeFormState, EmailItem } from '../types';

export function parseLeadsInput(rawText: string): {
  validEmails: string[];
  leadCount: number;
  duplicateCount: number;
  invalidCount: number;
} {
  const lines = rawText
    .split(/[\r\n,;]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const seen = new Set<string>();
  const validEmails: string[] = [];
  let duplicateCount = 0;
  let invalidCount = 0;

  for (const line of lines) {
    // Strip optional quotes or 'email' header
    const cleaned = line.replace(/["']/g, '').trim();
    if (cleaned.toLowerCase() === 'email' || cleaned === '') continue;

    if (!emailRegex.test(cleaned)) {
      invalidCount++;
      continue;
    }

    const lower = cleaned.toLowerCase();
    if (seen.has(lower)) {
      duplicateCount++;
    } else {
      seen.add(lower);
      validEmails.push(cleaned);
    }
  }

  return {
    validEmails,
    leadCount: validEmails.length,
    duplicateCount,
    invalidCount,
  };
}

export function calculateEstimatedSendTime(
  count: number,
  delaySeconds: number,
  hourlyLimit: number
): {
  totalSeconds: number;
  formattedDuration: string;
  summaryText: string;
} {
  if (count <= 0) {
    return {
      totalSeconds: 0,
      formattedDuration: '0m',
      summaryText: '0 emails · est. 0m to send',
    };
  }

  const safeHourly = Math.max(1, hourlyLimit || 1);
  const safeDelay = Math.max(0, delaySeconds || 0);

  // Campaign duration in seconds: volume divided by hourly throughput, with minimum interval between emails
  const rateLimitSeconds = (count / safeHourly) * 3600;
  const delayTotalSeconds = (count - 1) * safeDelay;
  const totalSeconds = Math.round(Math.max(rateLimitSeconds, delayTotalSeconds));

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);

  let formattedDuration = '';
  if (hours > 0 && minutes > 0) {
    formattedDuration = `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    formattedDuration = `${hours}h`;
  } else {
    formattedDuration = `${Math.max(1, minutes)}m`;
  }

  const summaryText = `${count} emails · est. ${formattedDuration} to send · about ${safeHourly} per hour`;

  return {
    totalSeconds,
    formattedDuration,
    summaryText,
  };
}

export function validateComposeForm(form: Partial<ComposeFormState>): {
  errors: ComposeErrors;
  isValid: boolean;
} {
  const errors: ComposeErrors = {};

  if (!form.fromEmail || !form.fromEmail.trim()) {
    errors.from = 'Sender email (From) is required';
  }

  const directCount = form.toEmails?.length || 0;
  const fileCount = (form.fileName && form.leadCount) ? form.leadCount : 0;
  const hasTypedRecipient = Boolean(form.toInput && form.toInput.trim());
  const totalRecipients = directCount + fileCount + (hasTypedRecipient ? 1 : 0);

  if (totalRecipients <= 0) {
    errors.to = 'Please add at least one recipient email (To) or upload a leads list';
  }

  if (!form.subject || !form.subject.trim()) {
    errors.subject = 'Subject is required';
  }

  const hourly = Number(form.hourlyLimit);
  if (form.hourlyLimit === undefined || form.hourlyLimit === '' || isNaN(hourly) || hourly < 1) {
    errors.hourlyLimit = 'Must be at least 1';
  }

  const delay = Number(form.delaySeconds);
  if (form.delaySeconds === undefined || form.delaySeconds === '' || isNaN(delay) || delay < 0) {
    errors.delaySeconds = 'Must be 0 or greater';
  }

  const isValid = Object.keys(errors).length === 0;
  return { errors, isValid };
}

export function filterEmails(emails: EmailItem[], query: string): EmailItem[] {
  if (!query || !query.trim()) return emails;
  const q = query.toLowerCase().trim();
  return emails.filter(
    (item) =>
      item.email.toLowerCase().includes(q) ||
      item.subject.toLowerCase().includes(q) ||
      (item.bodySnippet && item.bodySnippet.toLowerCase().includes(q))
  );
}
