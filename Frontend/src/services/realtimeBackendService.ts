/**
 * Real-time Email Backend Integration Service
 * ReachInbox Outbound Engine
 */

import { EmailItem } from '../types';

export interface CampaignPayload {
  fromEmail: string;
  fromName: string;
  subject: string;
  bodyHtml: string;
  recipients: Array<{
    email: string;
    company?: string;
    firstName?: string;
  }>;
  delaySeconds: number;
  hourlyLimit: number;
  startTimeIso: string;
}

export type RealtimeEvent =
  | {
    type: 'email:scheduled';
    data: {
      campaignId: string;
      jobId: string;
      sender?: string;
      email: string;
      scheduledTime: string;
    };
  }
  | {
    type: 'email:sending';
    data: {
      campaignId: string;
      jobId: string;
      sender?: string;
      email: string;
    };
  }
  | {
    type: 'email:sent';
    data: {
      campaignId: string;
      jobId: string;
      sender?: string;
      email: string;
      sentTime: string;
      messageId: string;
      previewUrl?: string | false;
    };
  }
  | {
    type: 'email:failed';
    data: {
      campaignId: string;
      jobId: string;
      sender?: string;
      email: string;
      reason: string;
      failedTime: string;
    };
  }
  | {
    type: 'campaign:progress';
    data: {
      campaignId: string;
      sender?: string;
      total: number;
      sentCount: number;
      failedCount: number;
      remainingCount: number;
    };
  };

export class RealtimeEmailClient {
  private ws: WebSocket | null = null;
  private wsUrl: string;
  private httpUrl: string;
  private reconnectTimer: any = null;
  private listeners: Set<(event: RealtimeEvent) => void> = new Set();
  private statusListeners: Set<(connected: boolean) => void> = new Set();
  private isExplicitlyClosed = false;

  constructor(backendBaseUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_BACKEND_URL) || 'https://email-scheduler-jqgy.onrender.com') {
    this.httpUrl = backendBaseUrl.replace(/\/$/, '');
    const wsProto = this.httpUrl.startsWith('https') ? 'wss' : 'ws';
    const host = this.httpUrl.replace(/^https?:\/\//, '');
    this.wsUrl = `${wsProto}://${host}/ws/delivery`;

    // Automatically attempt connection on startup in browser environment
    if (typeof window !== 'undefined') {
      setTimeout(() => this.connect(), 100);
    }
  }

  public getHttpUrl(): string {
    return this.httpUrl;
  }

  public setBackendUrl(url: string) {
    this.httpUrl = url.replace(/\/$/, '');
    const wsProto = this.httpUrl.startsWith('https') ? 'wss' : 'ws';
    const host = this.httpUrl.replace(/^https?:\/\//, '');
    this.wsUrl = `${wsProto}://${host}/ws/delivery`;
    this.connect();
  }

  public connect() {
    this.isExplicitlyClosed = false;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        this.notifyStatus(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as RealtimeEvent;
          this.listeners.forEach((listener) => listener(parsed));
        } catch {
          // non-json or ping
        }
      };

      this.ws.onclose = () => {
        this.notifyStatus(false);
        if (!this.isExplicitlyClosed) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => this.connect(), 3000);
        }
      };

      this.ws.onerror = () => {
        this.notifyStatus(false);
      };
    } catch {
      this.notifyStatus(false);
    }
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.notifyStatus(false);
  }

  public subscribe(listener: (event: RealtimeEvent) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public onStatusChange(listener: (connected: boolean) => void) {
    this.statusListeners.add(listener);
    // Immediately emit current state if already known
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      listener(true);
    }
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private notifyStatus(connected: boolean) {
    this.statusListeners.forEach((fn) => fn(connected));
  }

  /**
   * Dispatches campaign to backend REST API
   */
  public async scheduleCampaign(payload: CampaignPayload): Promise<{
    success: boolean;
    campaignId?: string;
    queuedJobs?: number;
    error?: string;
    emails?: any[];
  }> {
    try {
      const response = await fetch(`${this.httpUrl}/api/campaigns/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || `Server error: ${response.status}`);
      }

      return await response.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to connect to backend' };
    }
  }

  /**
   * Fetches emails from backend database
   */
  public async fetchEmails(options: { status?: string; sender?: string; page?: number; limit?: number } = {}): Promise<{
    data: any[];
    pagination?: { total: number; totalPages: number };
  }> {
    try {
      const params = new URLSearchParams();
      if (options.status) params.set('status', options.status);
      if (options.sender) params.set('sender', options.sender);
      if (options.page) params.set('page', String(options.page));
      if (options.limit) params.set('limit', String(options.limit));

      const res = await fetch(`${this.httpUrl}/api/emails?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[RealtimeClient] fetchEmails fallback:', err);
      return { data: [] };
    }
  }

  /**
   * Searches emails via Elasticsearch or DB backend
   */
  public async searchEmails(query: string, options: { status?: string; sender?: string } = {}): Promise<any[]> {
    try {
      const params = new URLSearchParams({ q: query });
      if (options.status) params.set('status', options.status);
      if (options.sender) params.set('sender', options.sender);

      const res = await fetch(`${this.httpUrl}/api/search?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.hits || [];
    } catch (err) {
      console.warn('[RealtimeClient] searchEmails fallback:', err);
      return [];
    }
  }

  /**
   * Checks Slack integration status for a tenant
   */
  public async checkSlackStatus(tenantId: string): Promise<{ connected: boolean; teamName?: string }> {
    try {
      const res = await fetch(`${this.httpUrl}/api/slack/status?tenantId=${encodeURIComponent(tenantId)}`);
      if (!res.ok) return { connected: false };
      return await res.json();
    } catch {
      return { connected: false };
    }
  }

  /**
   * Disconnects Slack for a tenant
   */
  public async disconnectSlack(tenantId: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.httpUrl}/api/slack/disconnect?tenantId=${encodeURIComponent(tenantId)}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public getSlackAuthUrl(tenantId: string): string {
    return `${this.httpUrl}/api/slack/connect?tenantId=${encodeURIComponent(tenantId)}`;
  }
}

export const realtimeClient = new RealtimeEmailClient();
