# 📧 Email Scheduler Backend

A production-grade email scheduling system built with **TypeScript**, **Express.js**, **BullMQ**, **Neon PostgreSQL**, **Elasticsearch**, and **Ethereal Email**. Supports multiple senders, per-sender rate limiting, Slack notifications, and a live queue dashboard.

---

## 🏗 Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Express API │────▶│  Neon PostgreSQL  │     │   Elasticsearch  │
│  (REST)      │     │  (Prisma ORM)    │     │   (Search Index) │
└──────┬───────┘     └──────────────────┘     └────────▲─────────┘
       │                                               │
       ▼                                               │
┌──────────────┐     ┌──────────────────┐              │
│   BullMQ     │────▶│  Worker(s)       │──────────────┘
│   (Redis)    │     │  • Rate Limiter  │
│              │     │  • SMTP Send     │───▶ Ethereal Email
└──────────────┘     │  • Slack Notify  │───▶ Slack API
                     └──────────────────┘
```

## ✨ Features

- **Schedule emails** for future delivery via REST API
- **Multiple senders** — each gets their own Ethereal SMTP account
- **BullMQ delayed jobs** — no cron, ever
- **Configurable worker concurrency** (default: 5 parallel workers)
- **Per-sender rate limiting** with Redis-backed atomic counters
- **Minimum delay between sends** (default: 2 seconds) via BullMQ limiter
- **Elasticsearch integration** for full-text search across all emails
- **Slack OAuth** — connect Slack for real-time rate-limit notifications
- **Live BullMQ dashboard** via Bull Board at `/admin/queues`
- **Real-Time WebSocket Engine** at `/ws/delivery` — live dispatch events (`email:scheduled`, `email:sending`, `email:sent`, `email:failed`)
- **React + Vite Frontend** integration — live campaign composing, real-time metrics, preview drawer, and status sync
- **Restart-safe** — pending emails recovered from DB on startup
- **Idempotent** — duplicate sends are prevented via unique job IDs

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **Docker** (for Redis + Elasticsearch)
- **Neon PostgreSQL** account (free tier works)

### 1. Clone & Install

```bash
cd Backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Your Neon PostgreSQL connection string
DATABASE_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require"

# Redis (Docker default)
REDIS_HOST=localhost
REDIS_PORT=6379

# Elasticsearch (Docker default)
ELASTICSEARCH_URL=http://localhost:9200

# Server
PORT=3000

# Worker config
WORKER_CONCURRENCY=5
MIN_DELAY_BETWEEN_SENDS_MS=2000
MAX_EMAILS_PER_HOUR_PER_SENDER=200

# Slack OAuth (optional — see Slack section below)
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_REDIRECT_URI=http://localhost:3000/api/slack/callback
```

### 3. Start Infrastructure

```bash
# Start Redis + Elasticsearch containers
docker-compose up -d
```

### 4. Set Up Database

```bash
# Push Prisma schema to Neon
npx prisma db push

# Generate Prisma client
npx prisma generate
```

### 5. Run the Server

```bash
# Development (with ts-node)
npm run dev

# Production
npm run build
npm start
```

You should see:

```
━━━ Email Scheduler Backend ━━━
✅ Database connected (Neon PostgreSQL)
✅ Elasticsearch index ready
✅ BullMQ worker started
✅ Startup recovery complete (0 emails re-enqueued)

🚀 Server running on http://localhost:3000
📊 Bull Board dashboard: http://localhost:3000/admin/queues
📡 API base: http://localhost:3000/api
```

---

## 📡 API Reference

### Schedule Emails

```http
POST /api/emails/schedule
Content-Type: application/json

{
  "emails": [
    {
      "sender": "alice@example.com",
      "recipient": "bob@example.com",
      "subject": "Meeting Tomorrow",
      "body": "<h1>Don't forget!</h1><p>Our meeting is at 10 AM.</p>",
      "scheduledAt": "2025-01-15T10:00:00Z"
    },
    {
      "sender": "carol@example.com",
      "recipient": "dave@example.com",
      "subject": "Weekly Report",
      "body": "<p>Attached is the weekly report.</p>",
      "scheduledAt": "2025-01-15T14:00:00Z"
    }
  ]
}
```

### List Emails

```http
GET /api/emails?status=QUEUED&sender=alice@example.com&page=1&limit=20
```

### Get Email by ID

```http
GET /api/emails/:id
```

### Cancel a Scheduled Email

```http
DELETE /api/emails/:id
```

### Search Emails (Elasticsearch)

```http
GET /api/search?q=meeting&sender=alice@example.com&status=SENT&from=0&size=20
```

### Health Check

```http
GET /health
```

### Slack Integration

```http
# Connect Slack (redirects to OAuth)
GET /api/slack/connect?tenantId=alice@example.com

# Check connection status
GET /api/slack/status?tenantId=alice@example.com

# Disconnect
DELETE /api/slack/disconnect?tenantId=alice@example.com
```

### Bull Board Dashboard

```
GET /admin/queues
```

---

## ⚡ Throughput, Rate Limiting & Concurrency

### Worker Concurrency

Controlled by `WORKER_CONCURRENCY` (default: **5**). Multiple jobs process in parallel safely because:
- Each job operates on a unique email record (keyed by DB ID)
- Rate limit checks use atomic Redis `INCR` (thread-safe across instances)
- DB updates are per-record (no shared mutable state)

### Minimum Delay Between Sends

Set via `MIN_DELAY_BETWEEN_SENDS_MS` (default: **2000ms** = 2 seconds between sends).

Implemented using **BullMQ's built-in `limiter`** option:
```ts
new Worker("email-scheduler", processor, {
  limiter: { max: 1, duration: 2000 }
});
```

This is a queue-level limiter — regardless of concurrency, at most 1 job is released from the queue every 2 seconds. This mimics real SMTP provider throttling.

### Per-Sender Rate Limiting

Controlled by `MAX_EMAILS_PER_HOUR_PER_SENDER` (default: **200**).

**Implementation:** Redis-backed atomic counters with hourly windows.

```
Key:    rate_limit:{sender}:{hourWindow}
Value:  count (atomic INCR)
TTL:    3600 seconds (auto-cleanup)
```

Where `hourWindow = Math.floor(Date.now() / 3_600_000)`.

**Why this is safe across multiple workers/instances:**
- Redis `INCR` is atomic — no race conditions
- No in-memory state — all workers read/write the same Redis key
- TTL ensures keys don't leak memory

**When the limit is hit:**
1. The job is **NOT dropped or failed**
2. It is **re-queued** with a delay = time remaining in current hour + random jitter (0–60s)
3. Order is preserved as much as possible (FIFO within the delay window)
4. A **Slack notification** is sent (if connected) via `chat.postMessage`
5. The DB record is reset to `SCHEDULED` with the new job ID

### Behavior Under Load (1000+ emails)

When 1000+ emails are scheduled for the same time:

1. **BullMQ limiter** gates throughput to 1 send per 2 seconds
2. **Per-sender rate limit** caps each sender at 200/hour (configurable)
3. Excess emails are **automatically delayed** to the next hour window
4. **Jitter** (0–60s random offset) prevents thundering herd on window boundaries
5. Jobs are persisted in both **Redis** (BullMQ) and **PostgreSQL** — neither restarts nor crashes lose them

---

## 🔌 Slack Integration

### Setup

1. Create a Slack app at [api.slack.com/apps](https://api.slack.com/apps)
2. Add the **OAuth & Permissions** scope: `chat:write`, `channels:read`
3. Set the **Redirect URL** to: `http://localhost:3000/api/slack/callback`
4. Copy your **Client ID** and **Client Secret** to `.env`

### Flow

1. User visits `GET /api/slack/connect?tenantId=alice@example.com`
2. Redirected to Slack OAuth consent screen
3. On approval, Slack redirects to `/api/slack/callback` with an auth code
4. Backend exchanges code for an access token, stores it in DB
5. When `alice@example.com`'s hourly rate limit is hit, a real Slack message is posted:

   > 🚨 **Rate Limit Hit** — Sender `alice@example.com` has reached the hourly email limit (200/200). Outgoing emails for this sender will be delayed until the next hour window.

### Disconnect / Reconnect

- If Slack is **not connected**, rate-limit hits simply log a message (no crash)
- If the user **disconnects** (`DELETE /api/slack/disconnect`), notifications stop
- If they **reconnect**, notifications resume — no redeploy needed

---

## 🔄 Persistence & Restart Safety

### How it works

1. Every email is first persisted to **PostgreSQL** before being queued
2. BullMQ jobs live in **Redis** with AOF persistence enabled
3. On server startup, `startup.ts` runs recovery:
   - Queries DB for all `SCHEDULED` or `QUEUED` emails with `scheduledAt > now`
   - Re-adds them to BullMQ (BullMQ deduplicates by `jobId`)
   - Recovers emails stuck in `SENDING` state (server crashed mid-send)
4. **No emails are lost or duplicated** after restart

### Idempotency

- Each email gets a unique BullMQ job ID: `email-{dbId}`
- BullMQ rejects duplicate job IDs — same email can't be queued twice
- Worker checks `email.status === "SENT"` before sending — even if a job runs twice, the email won't be sent again

---

## 📂 Project Structure

```
Backend/
├── prisma/
│   └── schema.prisma           # DB schema (Email + SlackIntegration)
├── src/
│   ├── index.ts                # Express app + startup orchestration
│   ├── config.ts               # Environment configuration
│   ├── db.ts                   # Prisma client singleton
│   ├── startup.ts              # Restart recovery logic
│   ├── queue/
│   │   ├── emailQueue.ts       # BullMQ queue definition + enqueue helper
│   │   ├── worker.ts           # Worker with concurrency + rate limiting
│   │   └── rateLimiter.ts      # Redis-backed per-sender rate limiter
│   ├── routes/
│   │   ├── emails.ts           # CRUD + scheduling endpoints
│   │   ├── search.ts           # Elasticsearch search endpoint
│   │   └── slack.ts            # Slack OAuth connect/disconnect
│   └── services/
│       ├── emailService.ts     # Ethereal SMTP sending
│       ├── elasticService.ts   # Elasticsearch indexing + search
│       └── slackService.ts     # Slack OAuth + notifications
├── docker-compose.yml          # Redis + Elasticsearch
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## 🛠 Tech Stack

| Component       | Technology                     |
|-----------------|--------------------------------|
| Language        | TypeScript                     |
| Framework       | Express.js                     |
| Database        | Neon PostgreSQL (serverless)   |
| ORM             | Prisma                         |
| Queue           | BullMQ (Redis-backed)          |
| Search          | Elasticsearch 8.x              |
| SMTP            | Nodemailer + Ethereal Email    |
| Dashboard       | @bull-board/express            |
| Notifications   | Slack OAuth v2 + Web API       |
| Infrastructure  | Docker (Redis + Elasticsearch) |

---

## 🚫 What This Does NOT Use

- ❌ No cron jobs (no `node-cron`, no `crontab`, no `agenda`)
- ❌ No in-memory-only state (all counts are in Redis, all records in PostgreSQL)
- ❌ No polling loops for scheduling (BullMQ delayed jobs handle timing)

