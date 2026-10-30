import prisma from "./db";
import { enqueueEmail } from "./queue/emailQueue";

/**
 * Startup recovery — re-enqueue all emails that should still be sent.
 *
 * On server restart, BullMQ's delayed jobs in Redis survive (Redis has AOF persistence).
 * However, if Redis was also restarted or jobs were lost, this function ensures
 * no scheduled emails are missed by re-adding them from the DB.
 *
 * BullMQ deduplicates by jobId (`email-{id}`), so re-adding an already-queued
 * job is a safe no-op.
 */
export async function recoverPendingEmails(): Promise<number> {
  console.log("[Startup] Recovering pending emails from database...");

  const pendingEmails = await prisma.email.findMany({
    where: {
      status: { in: ["SCHEDULED", "QUEUED"] },
      scheduledAt: { gte: new Date() }, // Only future emails
    },
    orderBy: { scheduledAt: "asc" },
  });

  let recovered = 0;

  for (const email of pendingEmails) {
    try {
      const jobId = await enqueueEmail(
        email.id,
        email.scheduledAt,
        email.sender,
        email.recipient,
        email.subject
      );

      // Update the jobId in DB (may already match)
      await prisma.email.update({
        where: { id: email.id },
        data: { jobId, status: "QUEUED" },
      });

      recovered++;
    } catch (err: any) {
      // If the job already exists (duplicate jobId), that's fine
      if (err.message?.includes("Duplicate")) {
        console.log(
          `[Startup] Email ${email.id} already in queue — skipping`
        );
      } else {
        console.error(
          `[Startup] Failed to re-enqueue email ${email.id}:`,
          err.message
        );
      }
    }
  }

  // Also handle emails that were in SENDING state when the server crashed
  const stuckSending = await prisma.email.findMany({
    where: { status: "SENDING" },
  });

  for (const email of stuckSending) {
    try {
      // Reset to SCHEDULED and re-enqueue for immediate delivery
      await prisma.email.update({
        where: { id: email.id },
        data: { status: "SCHEDULED" },
      });

      const retryJobId = `email-${email.id}-recovery-${Date.now()}`;
      await enqueueEmail(
        email.id,
        new Date(), // Send immediately
        email.sender,
        email.recipient,
        email.subject
      );

      recovered++;
    } catch (err: any) {
      console.error(
        `[Startup] Failed to recover stuck email ${email.id}:`,
        err.message
      );
    }
  }

  console.log(
    `[Startup] Recovery complete — ${recovered} emails re-enqueued, ` +
      `${stuckSending.length} stuck-in-sending emails recovered`
  );

  return recovered;
}

