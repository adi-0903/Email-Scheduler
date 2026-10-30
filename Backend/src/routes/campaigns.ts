import { Router, Request, Response } from "express";
import prisma from "../db";
import { enqueueEmail } from "../queue/emailQueue";
import { indexEmail } from "../services/elasticService";
import { broadcast } from "../services/websocketService";

const router = Router();

export interface CampaignPayload {
  fromEmail: string;
  fromName?: string;
  subject: string;
  bodyHtml: string;
  recipients: Array<{
    email: string;
    company?: string;
    firstName?: string;
  }>;
  delaySeconds?: number | string;
  hourlyLimit?: number | string;
  startTimeIso?: string;
}

/**
 * POST /api/campaigns/schedule
 * Endpoint called by the ReachInbox Frontend Outbound Engine
 */
router.post("/schedule", async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      fromEmail,
      fromName = "Sender",
      subject,
      bodyHtml,
      recipients,
      delaySeconds = 2,
      startTimeIso,
    } = req.body as CampaignPayload;

    if (!fromEmail || !subject || !bodyHtml) {
      res.status(400).json({
        success: false,
        error: "Missing required fields: fromEmail, subject, bodyHtml",
      });
      return;
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      res.status(400).json({
        success: false,
        error: "Recipients list cannot be empty",
      });
      return;
    }

    const campaignId = `camp_${Date.now()}`;
    const startTimestamp = startTimeIso ? new Date(startTimeIso).getTime() : Date.now();
    const baseDelayMs = Math.max(0, startTimestamp - Date.now());
    const pacingMs = Math.max(0, Number(delaySeconds) * 1000);

    const queuedEmails = [];

    for (let index = 0; index < recipients.length; index++) {
      const lead = recipients[index];
      if (!lead.email) continue;

      const delayForThisEmail = baseDelayMs + index * pacingMs;
      const scheduledDate = new Date(Date.now() + delayForThisEmail);

      const personalizedSubject = subject.replace(/\{\{firstName\}\}/g, lead.firstName || "there");
      const personalizedBody = bodyHtml.replace(/\{\{firstName\}\}/g, lead.firstName || "there");

      // 1. Create DB record
      const emailRecord = await prisma.email.create({
        data: {
          sender: fromEmail,
          recipient: lead.email,
          subject: personalizedSubject,
          body: personalizedBody,
          scheduledAt: scheduledDate,
          status: "SCHEDULED",
        },
      });

      // 2. Enqueue in BullMQ with spaced delay
      const jobId = await enqueueEmail(
        emailRecord.id,
        scheduledDate,
        fromEmail,
        lead.email,
        personalizedSubject
      );

      // 3. Update DB record with jobId and status
      const updated = await prisma.email.update({
        where: { id: emailRecord.id },
        data: { jobId, status: "QUEUED" },
      });

      // 4. Index in Elasticsearch (best effort)
      await indexEmail({
        ...updated,
        status: updated.status,
      });

      // 5. Broadcast real-time WebSocket event (with sender isolation tag)
      broadcast({
        type: "email:scheduled",
        data: {
          campaignId,
          jobId,
          sender: fromEmail.toLowerCase().trim(),
          email: lead.email,
          scheduledTime: scheduledDate.toLocaleString(),
        },
      });

      queuedEmails.push({
        id: updated.id,
        jobId,
        email: lead.email,
        scheduledAt: scheduledDate,
      });
    }

    res.status(200).json({
      success: true,
      campaignId,
      queuedJobs: queuedEmails.length,
      pacingSeconds: Number(delaySeconds),
      emails: queuedEmails,
    });
  } catch (err: any) {
    console.error("[API] Error scheduling campaign:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to schedule campaign",
    });
  }
});

export default router;

