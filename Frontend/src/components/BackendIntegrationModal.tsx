import React, { useState } from 'react';
import {
  X,
  Server,
  Radio,
  Copy,
  Check,
  Zap,
  Play,
  ArrowRight,
  Database,
  Mail,
  ShieldCheck,
  Clock,
  Layers,
} from 'lucide-react';

interface BackendIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
  backendUrl: string;
  onUpdateBackendUrl: (url: string) => void;
  onSimulateRealtimeDelivery: () => void;
}

export const BackendIntegrationModal: React.FC<BackendIntegrationModalProps> = ({
  isOpen,
  onClose,
  isConnected,
  backendUrl,
  onUpdateBackendUrl,
  onSimulateRealtimeDelivery,
}) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'backendCode' | 'payloadContract'>('architecture');
  const [copied, setCopied] = useState(false);
  const [inputUrl, setInputUrl] = useState(backendUrl);

  if (!isOpen) return null;

  const sampleBackendCode = `// ============================================================================
// ReachInbox Real-Time Email Scheduling Backend (Node.js + Express + BullMQ + ws)
// Dependencies: npm install express bullmq ioredis nodemailer ws cors dotenv
// ============================================================================

import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import nodemailer from 'nodemailer';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/delivery' });

// 1. Redis Connection & BullMQ Queue
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
});

const emailQueue = new Queue('reachinbox-emails', { connection: redisConnection });

// 2. Real-time WebSocket Broadcaster
function broadcast(event) {
  const payload = JSON.stringify(event);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// 3. SMTP Transporter (or Resend / SendGrid / AWS SES)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: Number(process.env.SMTP_PORT) || 587,
  auth: {
    user: process.env.SMTP_USER || 'ethereal.user@ethereal.email',
    pass: process.env.SMTP_PASS || 'ethereal_password',
  },
});

// 4. REST Endpoint: Receive Scheduled Campaign from Frontend
app.post('/api/campaigns/schedule', async (req, res) => {
  const { fromEmail, fromName, subject, bodyHtml, recipients, delaySeconds = 120, startTimeIso } = req.body;

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ success: false, error: 'Recipient list cannot be empty' });
  }

  const campaignId = 'camp_' + Date.now();
  const startTimestamp = startTimeIso ? new Date(startTimeIso).getTime() : Date.now();
  const baseDelayMs = Math.max(0, startTimestamp - Date.now());

  // Enqueue individual email jobs with spaced delays (Cold Email Pacing)
  const jobs = await Promise.all(
    recipients.map((lead, index) => {
      // Calculate delay per email to prevent IP ban & spam flagging
      const delayForThisEmail = baseDelayMs + index * (Number(delaySeconds) * 1000);

      return emailQueue.add(
        'send-email',
        {
          campaignId,
          fromEmail,
          fromName,
          recipient: lead.email,
          subject: subject.replace('{{firstName}}', lead.firstName || 'there'),
          bodyHtml: bodyHtml.replace('{{firstName}}', lead.firstName || 'there'),
        },
        {
          delay: delayForThisEmail,
          attempts: 3,
          backoff: { type: 'exponential', delay: 60000 },
        }
      );
    })
  );

  return res.json({
    success: true,
    campaignId,
    totalQueued: jobs.length,
    pacingSeconds: delaySeconds,
  });
});

// 5. Background BullMQ Worker: Sends Emails & Emits WebSocket Events
const emailWorker = new Worker(
  'reachinbox-emails',
  async (job) => {
    const { campaignId, fromEmail, fromName, recipient, subject, bodyHtml } = job.data;

    // Notify UI that email sending is in progress
    broadcast({
      type: 'email:sending',
      data: { campaignId, jobId: job.id, email: recipient },
    });

    try {
      // Dispatch via SMTP / ESP
      const info = await transporter.sendMail({
        from: \`"\${fromName}" <\${fromEmail}>\`,
        to: recipient,
        subject,
        html: bodyHtml,
      });

      // Real-time broadcast: Success
      broadcast({
        type: 'email:sent',
        data: {
          campaignId,
          jobId: job.id,
          email: recipient,
          sentTime: new Date().toLocaleString(),
          messageId: info.messageId,
        },
      });

      return { success: true, messageId: info.messageId };
    } catch (err) {
      // Real-time broadcast: Failure
      broadcast({
        type: 'email:failed',
        data: {
          campaignId,
          jobId: job.id,
          email: recipient,
          reason: err.message,
          failedTime: new Date().toLocaleString(),
        },
      });
      throw err;
    }
  },
  { connection: redisConnection, concurrency: 5 }
);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(\`🚀 ReachInbox Email Engine listening on http://localhost:\${PORT}\`);
  console.log(\`📡 Real-time WebSocket live at ws://localhost:\${PORT}/ws/delivery\`);
});
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sampleBackendCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shadow-inner">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Real-Time Email Engine Architecture
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Ready to Connect
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                How to wire your backend, BullMQ/Redis queue, and WebSockets to this ReachInbox frontend.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Backend Connection Bar */}
        <div className="bg-slate-950 px-6 py-3 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Target Backend API:</span>
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="http://localhost:4000"
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500 w-52 font-mono"
              />
              <button
                onClick={() => onUpdateBackendUrl(inputUrl)}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
              >
                Apply URL
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-500'
                }`}
              />
              <span className={isConnected ? 'text-emerald-400 font-medium' : 'text-slate-400'}>
                {isConnected ? 'WebSocket Connected' : 'Standalone Mode (Simulation Available)'}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              onSimulateRealtimeDelivery();
              onClose();
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Simulate 1 Real-Time Send Live
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-900">
          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'architecture'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            1. Architecture & Real-Time Flow
          </button>
          <button
            onClick={() => setActiveTab('backendCode')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'backendCode'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            2. Runnable Backend Code (Express + BullMQ + ws)
          </button>
          <button
            onClick={() => setActiveTab('payloadContract')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'payloadContract'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            3. API & WebSocket Payload Contracts
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {activeTab === 'architecture' && (
            <div className="space-y-6">
              {/* Architecture Blueprint Card */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400" />
                  Why Cold Email Needs Asynchronous Queueing (Not direct HTTP)
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  In cold emailing, you can never blast 100 emails synchronously inside one HTTP request. Doing so causes{' '}
                  <strong className="text-white">ESP rate-limiting</strong>,{' '}
                  <strong className="text-white">IP blacklisting</strong>, and browser timeouts. Instead, the industry-standard
                  architecture uses a persistent job queue with strict pacing:
                </p>

                {/* Flow Diagram */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-900 border border-blue-500/30 rounded-lg text-center flex flex-col items-center">
                    <Radio className="w-5 h-5 text-blue-400 mb-2" />
                    <span className="text-xs font-semibold text-white">1. ReachInbox UI</span>
                    <span className="text-[11px] text-slate-400 mt-1">
                      User submits schedule with delay & pacing
                    </span>
                  </div>

                  <div className="p-3 bg-slate-900 border border-indigo-500/30 rounded-lg text-center flex flex-col items-center">
                    <Database className="w-5 h-5 text-indigo-400 mb-2" />
                    <span className="text-xs font-semibold text-white">2. Express + Redis</span>
                    <span className="text-[11px] text-slate-400 mt-1">
                      Enqueues delayed jobs into BullMQ
                    </span>
                  </div>

                  <div className="p-3 bg-slate-900 border border-amber-500/30 rounded-lg text-center flex flex-col items-center">
                    <Mail className="w-5 h-5 text-amber-400 mb-2" />
                    <span className="text-xs font-semibold text-white">3. Worker + SMTP</span>
                    <span className="text-[11px] text-slate-400 mt-1">
                      Picks job when timer expires & dispatches email
                    </span>
                  </div>

                  <div className="p-3 bg-slate-900 border border-emerald-500/30 rounded-lg text-center flex flex-col items-center">
                    <Zap className="w-5 h-5 text-emerald-400 mb-2" />
                    <span className="text-xs font-semibold text-white">4. WebSocket Push</span>
                    <span className="text-[11px] text-slate-400 mt-1">
                      Emits event; UI moves row from Scheduled to Sent
                    </span>
                  </div>
                </div>
              </div>

              {/* 3 Pillars of Cold Email Delivery */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800">
                  <Clock className="w-4 h-4 text-amber-400 mb-2" />
                  <h4 className="text-xs font-bold text-white mb-1">Queue & Delay Pacing</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Jobs are spaced out by delay (e.g. 120s between leads, max 50/hour). BullMQ manages precise millisecond
                    timers in Redis.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 mb-2" />
                  <h4 className="text-xs font-bold text-white mb-1">Deliverability & Warmup</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Ensures DNS records (SPF, DKIM, DMARC) match your sender address. Handled via ESP like Resend, Amazon SES, or
                    Google Workspace SMTP.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800">
                  <Server className="w-4 h-4 text-blue-400 mb-2" />
                  <h4 className="text-xs font-bold text-white mb-1">Real-Time UI Reflection</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    When the background worker gets confirmation from SMTP, it broadcasts to WebSocket clients so the table updates
                    without a page reload.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'backendCode' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Complete standalone Express + BullMQ + WebSocket backend file (save as <code className="text-blue-400">server.mjs</code>):
                </span>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied to Clipboard!' : 'Copy Backend Code'}
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-x-auto text-xs font-mono text-slate-300 max-h-[460px] leading-relaxed">
                <pre>{sampleBackendCode}</pre>
              </div>
            </div>
          )}

          {activeTab === 'payloadContract' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">
                  1. POST /api/campaigns/schedule (Frontend to Backend)
                </h4>
                <pre className="bg-slate-900 p-3 rounded-lg text-xs font-mono text-emerald-300 overflow-x-auto">
{`{
  "fromEmail": "alex.morgan@reachinbox.ai",
  "fromName": "Alex Morgan",
  "subject": "Quick intro: scaling outbound at {{company}}",
  "bodyHtml": "<p>Hi {{firstName}}, noticed Northwind's rapid growth...</p>",
  "recipients": [
    { "email": "aarav.mehta@northwind.io", "firstName": "Aarav", "company": "Northwind" },
    { "email": "priya.nair@brightlabs.co", "firstName": "Priya", "company": "BrightLabs" }
  ],
  "delaySeconds": 120,
  "hourlyLimit": 50,
  "startTimeIso": "2026-10-31T10:00:00.000Z"
}`}
                </pre>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                  2. WebSocket Event Broadcasted by Worker (Backend to Frontend)
                </h4>
                <pre className="bg-slate-900 p-3 rounded-lg text-xs font-mono text-cyan-300 overflow-x-auto">
{`// When worker successfully delivers an email:
{
  "type": "email:sent",
  "data": {
    "campaignId": "camp_1730000000",
    "jobId": "job_14",
    "email": "aarav.mehta@northwind.io",
    "sentTime": "Oct 31, 2026, 10:02 AM",
    "messageId": "<c28d9-2918@smtp.provider.com>"
  }
}

// When delivery bounces or fails:
{
  "type": "email:failed",
  "data": {
    "campaignId": "camp_1730000000",
    "jobId": "job_15",
    "email": "sara.iqbal@cloudmint.com",
    "reason": "Delivery failed after 3 attempts (550 User not found)",
    "failedTime": "Oct 31, 2026, 10:04 AM"
  }
}`}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            Connects seamlessly with Node.js, Python (Celery/FastAPI), Go, or any Redis queue.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
