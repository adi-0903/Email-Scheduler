import { Queue } from "bullmq";
import { config } from "../config";

// Main email queue — all email jobs go through here
export const emailQueue = new Queue("email-scheduler", {
  connection: config.redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: {
      count: 1000, // Keep last 1000 completed jobs for dashboard visibility
    },
    removeOnFail: {
      count: 5000, // Keep failed jobs for debugging
    },
  },
});

/**
 * Add an email job to the queue with a delay calculated from scheduledAt.
 * Uses the DB record ID as the jobId for idempotency — BullMQ will reject
 * duplicate jobIds, preventing the same email from being queued twice.
 */
export async function enqueueEmail(
  emailId: string,
  scheduledAt: Date,
  sender: string,
  recipient: string,
  subject: string
): Promise<string> {
  const now = Date.now();
  const sendTime = new Date(scheduledAt).getTime();
  const delay = Math.max(0, sendTime - now);

  const job = await emailQueue.add(
    "send-email",
    {
      emailId,
      sender,
      recipient,
      subject,
    },
    {
      jobId: `email-${emailId}`, // Idempotency key
      delay,
    }
  );

  return job.id!;
}

