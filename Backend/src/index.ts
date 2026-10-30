import http from "http";
import express from "express";
import cors from "cors";
import { config } from "./config";
import prisma from "./db";

// Routes
import emailRoutes from "./routes/emails";
import campaignRoutes from "./routes/campaigns";
import searchRoutes from "./routes/search";
import slackRoutes from "./routes/slack";

// Queue & Worker
import { emailQueue } from "./queue/emailQueue";
import { startWorker } from "./queue/worker";

// Services
import { ensureIndex } from "./services/elasticService";
import { initWebSocketServer } from "./services/websocketService";

// Startup recovery
import { recoverPendingEmails } from "./startup";

// Bull Board dashboard
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";

async function main() {
  const app = express();

  // ── Middleware ──
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));

  // ── Bull Board Dashboard ──
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/admin/queues");

  createBullBoard({
    queues: [new BullMQAdapter(emailQueue)],
    serverAdapter,
  });

  app.use("/admin/queues", serverAdapter.getRouter());

  // ── API Routes ──
  app.use("/api/emails", emailRoutes);
  app.use("/api/campaigns", campaignRoutes);
  app.use("/api/search", searchRoutes);
  app.use("/api/slack", slackRoutes);

  // ── Health check ──
  app.get("/health", async (_req, res) => {
    try {
      // Check DB connection
      await prisma.$queryRaw`SELECT 1`;

      // Check Redis connection via queue
      const queueReady = await emailQueue.client;

      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        services: {
          database: "connected",
          redis: queueReady ? "connected" : "disconnected",
        },
      });
    } catch (err: any) {
      res.status(503).json({
        status: "unhealthy",
        error: err.message,
      });
    }
  });

  // ── Root ──
  app.get("/", (_req, res) => {
    res.json({
      name: "Email Scheduler API",
      version: "1.0.0",
      endpoints: {
        health: "GET /health",
        scheduleEmails: "POST /api/emails/schedule",
        listEmails: "GET /api/emails",
        getEmail: "GET /api/emails/:id",
        cancelEmail: "DELETE /api/emails/:id",
        searchEmails: "GET /api/search?q=keyword",
        slackConnect: "GET /api/slack/connect?tenantId=sender@example.com",
        slackStatus: "GET /api/slack/status?tenantId=sender@example.com",
        slackDisconnect: "DELETE /api/slack/disconnect?tenantId=sender@example.com",
        dashboard: "GET /admin/queues",
      },
    });
  });

  // ── Initialize services ──
  console.log("━━━ Email Scheduler Backend ━━━");

  // 1. Verify DB connection with retry (handles Neon serverless wake-up)
  let dbConnected = false;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await prisma.$connect();
      console.log("✅ Database connected (Neon PostgreSQL)");
      dbConnected = true;
      break;
    } catch (err: any) {
      console.warn(`⏳ Waiting for Neon DB to wake up (attempt ${attempt}/5)...`);
      if (attempt < 5) {
        await new Promise((r) => setTimeout(r, 2000));
      } else {
        console.error("❌ Database connection failed:", err.message);
      }
    }
  }
  if (!dbConnected) {
    process.exit(1);
  }

  // 2. Initialize Elasticsearch index (non-blocking — server starts even if ES is down)
  ensureIndex()
    .then(() => console.log("✅ Elasticsearch index ready"))
    .catch((err: any) =>
      console.warn(
        "⚠️  Elasticsearch not available — search will be degraded:",
        err.message
      )
    );

  // 3. Start BullMQ worker
  const worker = startWorker();
  console.log("✅ BullMQ worker started");

  // 4. Recover pending emails from DB
  try {
    const recovered = await recoverPendingEmails();
    console.log(`✅ Startup recovery complete (${recovered} emails re-enqueued)`);
  } catch (err: any) {
    console.error("⚠️  Startup recovery failed:", err.message);
  }

  // ── Create HTTP Server & WebSocket Server ──
  const server = http.createServer(app);
  initWebSocketServer(server);

  // ── Start server ──
  server.listen(config.port, () => {
    console.log(`\n🚀 Server running on http://localhost:${config.port}`);
    console.log(`📡 Real-time WebSocket live at ws://localhost:${config.port}/ws/delivery`);
    console.log(`📊 Bull Board dashboard: http://localhost:${config.port}/admin/queues`);
    console.log(`📡 API base: http://localhost:${config.port}/api`);
    console.log("");
  });

  // ── Graceful shutdown ──
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down gracefully...`);

    try {
      await worker.close();
      console.log("Worker stopped");
    } catch {}

    try {
      await emailQueue.close();
      console.log("Queue closed");
    } catch {}

    try {
      await prisma.$disconnect();
      console.log("Database disconnected");
    } catch {}

    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

