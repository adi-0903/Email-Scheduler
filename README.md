# 📧 ReachInbox Outbound Engine & Real-Time Email Scheduler

A high-throughput, persistent email scheduling platform built with **TypeScript**, **Express.js**, **BullMQ (Redis)**, **PostgreSQL (Neon)**, **Ethereal Email (SMTP)**, **Elasticsearch**, and a **React 19 + Vite** dashboard.

---

## 📋 Table of Contents

1. [Architecture Overview](#-architecture-overview)
2. [Prerequisites & Environment Variables](#-prerequisites--environment-variables)
3. [How to Run the Backend](#-how-to-run-the-backend)
4. [How to Run the Frontend](#-how-to-run-the-frontend)
5. [How to Set Up Ethereal Email](#-how-to-set-up-ethereal-email)
6. [Core Technical Deep Dives](#-core-technical-deep-dives)
   - [How Scheduling Works (Zero Cron)](#1-how-scheduling-works-zero-cron)
   - [How Persistence on Restart is Handled](#2-how-persistence-on-restart-is-handled)
   - [How Rate Limiting & Concurrency are Implemented](#3-how-rate-limiting--concurrency-are-implemented)
   - [Live Slack Notification on Rate Limit Hit](#4-live-slack-notification-on-rate-limit-hit)
7. [Feature Matrix](#-feature-matrix)
8. [Assumptions, Shortcuts & Trade-offs](#-assumptions-shortcuts--trade-offs)
9. [5-Minute Demo Video Walkthrough Guide](#-5-minute-demo-video-walkthrough-guide)

---

## 🏗 Architecture Overview

```
                               ┌────────────────────────────────────────────────────────┐
                               │                 ReachInbox Frontend                    │
                               │                (React 19 + Vite + Tailwind)             │
                               │                   http://localhost:3000                │
                               └───────────────────────────┬────────────────────────────┘
                                                           │
                                        ┌──────────────────┴──────────────────┐
                                        │ HTTP REST API                       │ WebSocket Stream
                                        ▼ (Port 4000)                         ▼ (/ws/delivery)
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       Express.js Backend Engine                                   │
│                                                                                                   │
│  ┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐   ┌────────────┐  │
│  │   Campaign Route     │   │     Emails Route     │   │   Elasticsearch      │   │   Slack    │  │
│  │ /api/campaigns/sched │   │  /api/emails (CRUD)  │   │  /api/search (Index) │   │ OAuth API  │  │
│  └──────────┬───────────┘   └──────────┬───────────┘   └──────────┬───────────┘   └─────┬──────┘  │
└─────────────┼──────────────────────────┼──────────────────────────┼─────────────────────┼─────────┘
              │                          │                          │                     │
              ▼                          ▼                          ▼                     ▼
┌───────────────────────────┐  ┌───────────────────┐      ┌───────────────────┐ ┌───────────────────┐
│      Neon PostgreSQL      │  │    Redis Cloud    │      │   Elasticsearch   │ │     Slack API     │
│       (Prisma ORM)        │  │     (BullMQ)      │      │   (Docker 9200)   │ │  chat.postMessage │
│                           │  │                   │      └───────────────────┘ └───────────────────┘
│ • email records           │  │ • delayed queue   │
│ • job ID idempotency      │  │ • atomic counters │
│ • slack integration tokens│  │ • worker lock     │
└─────────────▲─────────────┘  └─────────▲─────────┘
              │                          │
              └──────────────┬───────────┘
                             │
              ┌──────────────┴───────────────────────────┐
              │           BullMQ Worker Pool             │
              │   • Concurrency: Configurable (default 5)│
              │   • Delay Throttle: Min 2000ms           │
              │   • Atomic hourly rate limiter           │
              │   • Live WebSocket progress broadcaster  │
              └──────────────┬───────────────────────────┘
                             │
                             ▼
              ┌──────────────────────────────────────────┐
              │           Ethereal Email SMTP            │
              │ • Per-sender test mail accounts          │
              │ • Live message preview URLs              │
              └──────────────────────────────────────────┘
```

---

## ⚙ Prerequisites & Environment Variables

### Prerequisites
- **Node.js** ≥ 18 (Tested on v24.11.0)
- **npm** ≥ 9
- **Docker** (optional: only required for local Elasticsearch container)
- **Redis**: Cloud or local (Redis Cloud instance pre-configured)
- **PostgreSQL**: Cloud (Neon PostgreSQL connection pre-configured)

### Environment Files

#### Backend (`Backend/.env`)
```env
# Database (Neon PostgreSQL connection pooler)
DATABASE_URL="postgresql://neondb_owner:npg_SBOAC30Zkcdy@ep-plain-silence-b5zspc6x-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Redis (Redis Cloud instance)
REDIS_URL="redis://default:ScQydyJMXC5BPS1G6eqgw6Y395Miv1GM@redis-14939.c124.us-central1-1.gce.cloud.redislabs.com:14939"

# Elasticsearch (search indexing)
ELASTICSEARCH_URL=http://localhost:9200

# Server
PORT=4000
BASE_URL=http://localhost:4000

# BullMQ Worker Concurrency & Throttling
WORKER_CONCURRENCY=5
MIN_DELAY_BETWEEN_SENDS_MS=2000

# Rate Limiting
MAX_EMAILS_PER_HOUR_PER_SENDER=200

# Slack Integration (OAuth v2)
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_REDIRECT_URI=http://localhost:4000/api/slack/callback
```

#### Frontend (`Frontend/.env`)
```env
VITE_BACKEND_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000/ws/delivery
```

---

## 🚀 How to Run the Backend

```bash
# 1. Navigate to the backend directory
cd Backend

# 2. Install dependencies
npm install

# 3. Synchronize database schema with Neon PostgreSQL
npx prisma db push

# 4. Build TypeScript code
npm run build

# 5. Start the production backend server
npm start
```

For development with hot reload:
```bash
npm run dev
```

The backend starts:
- **REST API**: `http://localhost:4000/api`
- **Health Check**: `http://localhost:4000/health`
- **Live BullMQ Queue Dashboard**: `http://localhost:4000/admin/queues`
- **Real-Time WebSocket Stream**: `ws://localhost:4000/ws/delivery`

---

## 💻 How to Run the Frontend

In a separate terminal:

```bash
# 1. Navigate to the frontend directory
cd Frontend

# 2. Install dependencies
npm install

# 3. Start Vite development server
npm run dev
```

Open your browser at:
👉 **`http://localhost:3000`**

The dashboard will open, automatically establish a WebSocket handshake with the backend engine (`ws://localhost:4000/ws/delivery`), and display live database records.

---

## 📬 How to Set Up Ethereal Email

Ethereal is a fake SMTP service provided by Nodemailer for testing email generation:

1. **Automatic Account Provisioning**: You do **not** need to manually register on Ethereal. When a sender dispatches an email for the first time, our backend service automatically creates an ephemeral test account using `nodemailer.createTestAccount()`.
2. **Account Caching**: Each sender address (e.g., `alex.morgan@reachinbox.ai`, `growth@northwind.io`) receives its own dedicated transporter cached in memory.
3. **Live Preview URL**: Upon dispatch, Nodemailer generates a preview URL logged to the console:
   ```
   [Worker] ✅ Email d807ca89 sent successfully. Preview: https://ethereal.email/message/...
   ```
   You can click this link to inspect the HTML message, headers, subject, and render preview exactly as an inbox client would see it.

---

## 🔬 Core Technical Deep Dives

### 1. How Scheduling Works (Zero Cron)
- **Hard Constraint**: Absolute ban on `node-cron`, `crontab`, `agenda`, or polling intervals.
- **BullMQ Delayed Jobs**: When an email is scheduled for `scheduledAt`:
  ```ts
  const now = Date.now();
  const sendTime = new Date(scheduledAt).getTime();
  const delay = Math.max(0, sendTime - now);

  await emailQueue.add('send-email', { emailId, sender, recipient, subject }, {
    jobId: `email-${emailId}`, // Deterministic idempotency key
    delay,
  });
  ```
- **Redis Timers**: BullMQ schedules delayed jobs using Redis sorted sets (`ZSET`) keyed by execution timestamp. Redis triggers ready jobs without CPU-consuming polling.
- **Pacing**: Multiple recipients scheduled in one campaign are spaced with `index * delaySeconds * 1000` to prevent ESP spam-flagging.

### 2. How Persistence on Restart is Handled
- **Two-Tier Storage**:
  1. **Relational Source of Truth**: Every email is written to Neon PostgreSQL with status `SCHEDULED` and a unique `jobId` before queueing.
  2. **Queue State Persistence**: Redis Cloud persists queue states via AOF (Append-Only File) logs.
- **Graceful Startup Recovery (`startup.ts`)**:
  On server boot:
  1. Queries all records from PostgreSQL where `status IN ('SCHEDULED', 'QUEUED')` and `scheduledAt >= NOW()`.
  2. Re-adds them to BullMQ with `delay = scheduledAt - now`.
  3. BullMQ deduplicates using `jobId: email-${email.id}`, making this recovery completely idempotent.
  4. Scans for any stuck jobs left in `SENDING` (e.g. server crashed mid-send) and re-enqueues them for immediate delivery.

### 3. How Rate Limiting & Concurrency are Implemented

#### Worker Concurrency
- Configured via `WORKER_CONCURRENCY=5` in `.env`.
- BullMQ worker instantiates 5 parallel processing loops.
- Because BullMQ locks individual jobs atomically via Redis, parallel workers never process the same job twice.

#### Minimum Delay Between Individual Sends
- Configured via `MIN_DELAY_BETWEEN_SENDS_MS=2000` (2 seconds).
- Enforced at queue worker level using BullMQ's native token bucket limiter:
  ```ts
  new Worker('email-scheduler', processor, {
    concurrency: config.workerConcurrency,
    limiter: {
      max: 1,
      duration: config.minDelayBetweenSendsMs, // 1 send every 2000ms
    },
  });
  ```
- Guarantees minimum spacing regardless of how many jobs enter the queue at once.

#### Atomic Per-Sender Hourly Rate Limiting
- Keyed by hour window: `rate_limit:${sender}:${Math.floor(Date.now() / 3600000)}`
- Before an email sends, worker invokes atomic `INCR` on this Redis key:
  - If count exceeds `MAX_EMAILS_PER_HOUR_PER_SENDER` (e.g. 200/hr):
    1. Decrements counter back (`DECR`).
    2. Calculates milliseconds remaining until next hour window.
    3. Adds jitter (0–60s) to prevent thundering herd on window rollover.
    4. Re-enqueues job into next hour window:
       ```ts
       await emailQueue.add('send-email', data, { delay: msUntilNextWindow + jitter });
       ```
    5. Updates DB status to `SCHEDULED`.
    6. Triggers live Slack notification.
- **Zero Dropped Jobs**: Emails exceeding the hourly limit are never discarded; they are postponed to the subsequent window.

### 4. Live Slack Notification on Rate Limit Hit
- Frontend provides a **Connect Slack** OAuth v2 flow (`/api/slack/connect`).
- Stores access tokens in the `SlackIntegration` table in Neon PostgreSQL.
- The moment a sender reaches their hourly rate limit, the worker executes:
  ```ts
  await slackService.notifyRateLimitHit(sender, currentCount, limit);
  ```
  Posting a live alert to the connected Slack channel via `https://slack.com/api/chat.postMessage`.
- **Fault-tolerant**: If Slack is not connected or disconnected, notifications skip gracefully without throwing or crashing the worker.

---

## 📊 Feature Matrix

| Feature | Backend Implementation | Frontend Implementation |
|---|---|---|
| **Scheduling** | BullMQ delayed jobs (`delay` ms), zero cron | Time-picker, instant schedule calculator |
| **Pacing / Delays** | Worker limiter (`1 / 2000ms`) | Configurable delay input in Compose modal |
| **Persistence** | Neon PostgreSQL + startup recovery logic | Live sync via REST + WebSocket reconnect |
| **Rate Limiting** | Redis atomic sliding window counters | Visual feedback, limit settings |
| **Concurrency** | Configurable worker pool (default 5) | Non-blocking reactive interface |
| **Search** | Elasticsearch 8.x fuzzy multi-match | Real-time search filter with debouncing |
| **Email Delivery** | Nodemailer + Ethereal fake SMTP | Ethereal preview links logged |
| **Real-Time Stream** | Native WebSocket server (`/ws/delivery`) | Live item movement from Scheduled to Sent |
| **Live Queue Monitor** | `@bull-board/express` at `/admin/queues` | Direct header navigation pill |
| **Slack OAuth** | Slack Web API v2 token management | One-click Connect/Disconnect button in Sidebar |
| **Authentication** | Extensible tenant/user model | Full Login/Create Account modal & state |

---

## ⚖ Assumptions, Shortcuts & Trade-offs

1. **Dockerized vs Cloud Infrastructure**:
   - *Decision*: We used **Neon PostgreSQL** and **Redis Cloud** for cloud reliability, with optional local Docker for Elasticsearch.
   - *Trade-off*: Eliminates local Redis/Postgres container startup errors on Windows environments while keeping the setup portable.
2. **Elasticsearch Fallback**:
   - *Decision*: If Elasticsearch container is not running, the API falls back gracefully to relational PostgreSQL filtering rather than crashing the server.
3. **Ethereal Account Provisioning**:
   - *Trade-off*: Creating an Ethereal account on the fly takes ~1 second on the first send for a new sender email address. Subsequent sends reuse the cached transporter.
4. **WebSocket Protocol**:
   - *Decision*: Used standard `ws` rather than Socket.io to keep client bundle lightweight and zero-dependency on frontend.

---

## 🎥 5-Minute Demo Video Walkthrough Guide

Follow this sequence to record your 5-minute video:

### 1. Introduction (0:00 - 0:45)
- Open browser at `http://localhost:3000` (Frontend) and `http://localhost:4000/admin/queues` (Bull Board Dashboard in a second tab).
- Point out the **Real-Time Backend** indicator (green), the metric cards, and the Scheduled/Sent tables.

### 2. Creating Scheduled Emails (0:45 - 2:00)
- Click **"Compose New Email"**.
- Select sender (`alex.morgan@reachinbox.ai`), enter recipient(s), subject, and body.
- Set delay to `2` seconds and schedule for a few seconds in the future.
- Click **"Schedule Email"**.
- Point out the toast: email is persisted in Neon DB and enqueued in BullMQ.
- Switch to Bull Board tab to show the delayed job in the queue.

### 3. Real-Time Delivery & Ethereal SMTP (2:00 - 3:00)
- Watch the worker process the job.
- Notice the frontend automatically receives the WebSocket event and moves the email from **Scheduled** to **Sent** without refreshing.
- Show terminal console output displaying the Ethereal Email preview URL:
  `https://ethereal.email/message/...`
- Open the URL in browser to show the actual rendered email.

### 4. Server Restart & Persistence Scenario (3:00 - 4:15)
- Compose and schedule an email for 2 minutes into the future.
- Show it listed under **Scheduled Emails**.
- Go to terminal and stop the backend server (`Ctrl + C`).
- Highlight that the server is down (frontend WebSocket disconnect toast appears).
- Restart the backend server (`npm start`).
- Point out the log:
  ```
  [Startup] Recovering pending emails from database...
  ✅ Startup recovery complete (1 email re-enqueued)
  ```
- Wait for the scheduled time: the email is dispatched at the scheduled time with zero loss or duplication.

### 5. Rate Limiting, Pacing & Slack (4:15 - 5:00)
- Briefly show `.env` settings (`MAX_EMAILS_PER_HOUR_PER_SENDER=200`, `MIN_DELAY_BETWEEN_SENDS_MS=2000`).
- Explain how BullMQ paces jobs with minimum 2-second delays and atomic Redis counters.
- Show the **Connect Slack** button and explain how rate-limit events trigger real alerts via `chat.postMessage`.
