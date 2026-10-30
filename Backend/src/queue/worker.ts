import { Worker, Job } from "bullmq";
import { config } from "../config";
import prisma from "../db";
import { sendEmail } from "../services/emailService";
import { indexEmail } from "../services/elasticService";
import { notifyRateLimitHit } from "../services/slackService";
import { broadcast } from "../services/websocketService";
import {
  checkAndIncrementRateLimit,
} from "./rateLimiter";
import { emailQueue } from "./emailQueue";

let worker: Worker | null = null;

/**
 * Start the BullMQ worker that processes email-send jobs.
 *
 * Key behaviors:
 * - Configurable concurrency via WORKER_CONCURRENCY
 * - Per-sender rate limiting via Redis counters
 * - When rate limit is exceeded, job is delayed to next hour window (not dropped)
 * - Idempotency: checks DB status before sending — skips if already SENT
 * - Minimum delay between sends via BullMQ limiter
 */
export function startWorker(): Worker {
  worker = new Worker(
    "email-scheduler",
    async (job: Job) => {
      const { emailId, sender, recipient, subject } = job.data;

      console.log(
        `[Worker] Processing job ${job.id} — email ${emailId} from "${sender}" to "${recipient}"`
      );

      // ── Step 1: Idempotency check ──
      const email = await prisma.email.findUnique({
        where: { id: emailId },
      });

      if (!email) {
        console.warn(`[Worker] Email ${emailId} not found in DB — skipping`);
        return;
      }

      if (email.status === "SENT") {
        console.log(
          `[Worker] Email ${emailId} already sent — idempotency skip`
        );
        return;
      }

      // ── Step 2: Rate limit check ──
      const rateCheck = await checkAndIncrementRateLimit(sender);

      if (!rateCheck.allowed) {
        console.warn(
          `[Worker] Rate limit hit for sender "${sender}" (${rateCheck.currentCount}/${config.maxEmailsPerHourPerSender}). Delaying job to next hour window.`
        );

        // Notify Slack (non-blocking, never throws)
        await notifyRateLimitHit(
          sender,
          rateCheck.currentCount,
          config.maxEmailsPerHourPerSender
        );

        // Re-queue this job into the next hour window
        // Add a small random offset (0-60s) to spread load
        const jitter = Math.floor(Math.random() * 60_000);
        const delay = rateCheck.msUntilNextWindow + jitter;

        // Remove current job and re-add with new delay
        // We create a new job with a different ID suffix to avoid BullMQ dedup
        const retryJobId = `email-${emailId}-retry-${Date.now()}`;
        await emailQueue.add(
          "send-email",
          { emailId, sender, recipient, subject },
          { delay, jobId: retryJobId }
        );

        // Update DB status back to SCHEDULED
        await prisma.email.update({
          where: { id: emailId },
          data: { status: "SCHEDULED", jobId: retryJobId },
        });

        console.log(
          `[Worker] Re-queued email ${emailId} with delay ${Math.round(delay / 1000)}s`
        );
        return;
      }

      // ── Step 3: Mark as SENDING ──
      await prisma.email.update({
        where: { id: emailId },
        data: { status: "SENDING" },
      });

      broadcast({
        type: "email:sending",
        data: {
          campaignId: emailId,
          jobId: job.id ?? "",
          sender: sender.toLowerCase().trim(),
          email: recipient,
        },
      });

      // ── Step 4: Send the email via Ethereal SMTP ──
      try {
        const result = await sendEmail(sender, recipient, subject, email.body);

        // ── Step 5: Mark as SENT ──
        const updatedEmail = await prisma.email.update({
          where: { id: emailId },
          data: {
            status: "SENT",
            sentAt: new Date(),
            previewUrl: result.previewUrl ? String(result.previewUrl) : null,
            attempts: { increment: 1 },
          },
        });

        // ── Step 6: Index in Elasticsearch ──
        await indexEmail({
          ...updatedEmail,
          status: updatedEmail.status,
        });

        broadcast({
          type: "email:sent",
          data: {
            campaignId: emailId,
            jobId: job.id ?? "",
            sender: sender.toLowerCase().trim(),
            email: recipient,
            sentTime: new Date().toLocaleString(),
            messageId: result.messageId,
            previewUrl: result.previewUrl,
          },
        });

        console.log(
          `[Worker] ✅ Email ${emailId} sent successfully. Preview: ${result.previewUrl}`
        );
      } catch (sendError: any) {
        // Update failure in DB
        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: "FAILED",
            lastError: sendError.message,
            attempts: { increment: 1 },
          },
        });

        broadcast({
          type: "email:failed",
          data: {
            campaignId: emailId,
            jobId: job.id ?? "",
            sender: sender.toLowerCase().trim(),
            email: recipient,
            reason: sendError.message,
            failedTime: new Date().toLocaleString(),
          },
        });

        console.error(
          `[Worker] ❌ Failed to send email ${emailId}:`,
          sendError.message
        );

        // Re-throw so BullMQ's retry mechanism kicks in
        throw sendError;
      }
    },
    {
      connection: config.redis,
      concurrency: config.workerConcurrency,
      limiter: {
        max: 1,
        duration: config.minDelayBetweenSendsMs, // Min delay between sends
      },
    }
  );

  // ── Event handlers ──
  worker.on("completed", (job) => {
    console.log(`[Worker] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on("error", (err) => {
    console.error("[Worker] Worker error:", err.message);
  });

  console.log(
    `[Worker] Started with concurrency=${config.workerConcurrency}, ` +
      `minDelay=${config.minDelayBetweenSendsMs}ms, ` +
      `maxPerHourPerSender=${config.maxEmailsPerHourPerSender}`
  );

  return worker;
}

export function getWorker(): Worker | null {
  return worker;
}

