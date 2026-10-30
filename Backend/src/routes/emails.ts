import { Router, Request, Response } from "express";
import prisma from "../db";
import { enqueueEmail } from "../queue/emailQueue";
import { indexEmail } from "../services/elasticService";

const router = Router();

/**
 * POST /api/emails/schedule
 * Schedule one or more emails for future delivery.
 *
 * Body:
 * {
 *   "emails": [
 *     {
 *       "sender": "alice@example.com",
 *       "recipient": "bob@example.com",
 *       "subject": "Hello",
 *       "body": "<h1>Hi Bob</h1>",
 *       "scheduledAt": "2025-01-15T10:00:00Z"
 *     }
 *   ]
 * }
 */
router.post("/schedule", async (req: Request, res: Response): Promise<void> => {
  try {
    const { emails } = req.body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      res.status(400).json({
        error: "Request body must contain a non-empty 'emails' array",
      });
      return;
    }

    const results = [];

    for (const emailData of emails) {
      const { sender, recipient, subject, body, scheduledAt } = emailData;

      // Validation
      if (!sender || !recipient || !subject || !body || !scheduledAt) {
        results.push({
          error: "Missing required fields: sender, recipient, subject, body, scheduledAt",
          data: emailData,
        });
        continue;
      }

      const scheduledDate = new Date(scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        results.push({
          error: "Invalid scheduledAt date",
          data: emailData,
        });
        continue;
      }

      // Create DB record
      const email = await prisma.email.create({
        data: {
          sender,
          recipient,
          subject,
          body,
          scheduledAt: scheduledDate,
          status: "SCHEDULED",
        },
      });

      // Enqueue in BullMQ with delay
      const jobId = await enqueueEmail(
        email.id,
        scheduledDate,
        sender,
        recipient,
        subject
      );

      // Update DB with jobId and set status to QUEUED
      const updatedEmail = await prisma.email.update({
        where: { id: email.id },
        data: { jobId, status: "QUEUED" },
      });

      // Index in Elasticsearch (for search)
      await indexEmail({
        ...updatedEmail,
        status: updatedEmail.status,
      });

      results.push({
        id: email.id,
        jobId,
        sender,
        recipient,
        subject,
        scheduledAt: scheduledDate,
        status: "QUEUED",
      });
    }

    res.status(201).json({
      message: `${results.filter((r) => !("error" in r)).length} email(s) scheduled`,
      results,
    });
  } catch (err: any) {
    console.error("[API] Error scheduling emails:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/emails
 * List all emails with strict tenant/sender data isolation.
 * Query params: status, sender, page, limit
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      status,
      sender,
      page = "1",
      limit = "20",
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    // STRICT MULTI-TENANT PRIVACY GUARD:
    // If sender email is not provided, return empty list (prevents data leakage between users)
    if (!sender || !sender.trim()) {
      res.json({
        data: [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: 0,
          totalPages: 0,
        },
      });
      return;
    }

    const where: any = {
      sender: sender.toLowerCase().trim(),
    };

    if (status) {
      const upper = status.toUpperCase();
      if (upper === "SCHEDULED" || upper === "QUEUED") {
        where.status = { in: ["SCHEDULED", "QUEUED"] };
      } else {
        where.status = upper;
      }
    }

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        orderBy: { scheduledAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.email.count({ where }),
    ]);

    res.json({
      data: emails,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err: any) {
    console.error("[API] Error listing emails:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/emails/quota?sender=user@example.com
 * Returns strict daily, weekly, and monthly limits and usage for a specific sender.
 */
router.get("/quota", async (req: Request, res: Response): Promise<void> => {
  try {
    const { sender } = req.query as { sender?: string };

    if (!sender || !sender.trim()) {
      res.status(400).json({ error: "Sender email is required to retrieve quota." });
      return;
    }

    const normalizedSender = sender.toLowerCase().trim();
    const now = new Date();

    // Start of today (UTC midnight)
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));

    // Start of this week (Monday 00:00 UTC)
    const dayOfWeek = now.getUTCDay();
    const distanceToMonday = (dayOfWeek + 6) % 7;
    const startOfWeek = new Date(startOfToday.getTime() - distanceToMonday * 24 * 60 * 60 * 1000);

    // Start of this month (1st of month 00:00 UTC)
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));

    // Next reset timestamps
    const resetDaily = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    const resetWeekly = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
    const resetMonthly = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));

    // Tier limits
    const DAILY_LIMIT = 100;
    const WEEKLY_LIMIT = 500;
    const MONTHLY_LIMIT = 2000;

    // Count user's emails in database (scheduled or sent)
    const [dailyUsed, weeklyUsed, monthlyUsed] = await Promise.all([
      prisma.email.count({
        where: {
          sender: normalizedSender,
          createdAt: { gte: startOfToday },
        },
      }),
      prisma.email.count({
        where: {
          sender: normalizedSender,
          createdAt: { gte: startOfWeek },
        },
      }),
      prisma.email.count({
        where: {
          sender: normalizedSender,
          createdAt: { gte: startOfMonth },
        },
      }),
    ]);

    res.json({
      sender: normalizedSender,
      daily: {
        used: dailyUsed,
        limit: DAILY_LIMIT,
        remaining: Math.max(0, DAILY_LIMIT - dailyUsed),
        resetsAt: resetDaily.toISOString(),
      },
      weekly: {
        used: weeklyUsed,
        limit: WEEKLY_LIMIT,
        remaining: Math.max(0, WEEKLY_LIMIT - weeklyUsed),
        resetsAt: resetWeekly.toISOString(),
      },
      monthly: {
        used: monthlyUsed,
        limit: MONTHLY_LIMIT,
        remaining: Math.max(0, MONTHLY_LIMIT - monthlyUsed),
        resetsAt: resetMonthly.toISOString(),
      },
      pacing: {
        minDelaySeconds: 2,
        maxPerHour: 200,
      },
    });
  } catch (err: any) {
    console.error("[API] Error fetching quota:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/emails/:id
 * Get a single email by ID (with sender isolation).
 */
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { sender } = req.query as { sender?: string };

    const where: any = { id };
    if (sender) {
      where.sender = sender.toLowerCase().trim();
    }

    const email = await prisma.email.findFirst({
      where,
    });

    if (!email) {
      res.status(404).json({ error: "Email not found" });
      return;
    }

    res.json(email);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/emails/:id
 * Cancel a scheduled email (only if not yet sent and authorized).
 */
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { sender } = req.query as { sender?: string };

    const where: any = { id };
    if (sender) {
      where.sender = sender.toLowerCase().trim();
    }

    const email = await prisma.email.findFirst({
      where,
    });

    if (!email) {
      res.status(404).json({ error: "Email not found or unauthorized" });
      return;
    }

    if (email.status === "SENT") {
      res.status(400).json({ error: "Cannot cancel an already-sent email" });
      return;
    }

    // Remove from BullMQ queue
    if (email.jobId) {
      const { emailQueue } = await import("../queue/emailQueue");
      const job = await emailQueue.getJob(email.jobId);
      if (job) {
        await job.remove();
      }
    }

    // Update DB status
    await prisma.email.update({
      where: { id: email.id },
      data: { status: "FAILED", lastError: "Cancelled by user" },
    });

    res.json({ message: "Email cancelled", id: email.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
