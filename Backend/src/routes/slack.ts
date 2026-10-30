import { Router, Request, Response } from "express";
import {
  getSlackAuthUrl,
  handleSlackCallback,
  disconnectSlack,
} from "../services/slackService";
import prisma from "../db";

const router = Router();

/**
 * GET /api/slack/connect?tenantId=alice@example.com
 * Initiates Slack OAuth flow — redirects the user to Slack's authorize page.
 */
router.get("/connect", (req: Request, res: Response): void => {
  const { tenantId } = req.query as { tenantId?: string };

  if (!tenantId) {
    res.status(400).json({
      error: "tenantId query parameter is required (e.g. sender email)",
    });
    return;
  }

  const authUrl = getSlackAuthUrl(tenantId);
  res.redirect(authUrl);
});

/**
 * GET /api/slack/callback?code=xxx&state=tenantId
 * Slack OAuth callback — exchanges code for token and stores it.
 */
router.get("/callback", async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, state: tenantId, error } = req.query as Record<string, string>;

    if (error) {
      res.status(400).json({
        error: `Slack OAuth error: ${error}`,
      });
      return;
    }

    if (!code || !tenantId) {
      res.status(400).json({
        error: "Missing code or state (tenantId) from Slack callback",
      });
      return;
    }

    const { teamName } = await handleSlackCallback(code, tenantId);

    res.json({
      message: `Successfully connected to Slack workspace "${teamName}" for tenant "${tenantId}"`,
      tenantId,
      teamName,
    });
  } catch (err: any) {
    console.error("[API] Slack callback error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/slack/disconnect?tenantId=alice@example.com
 * Disconnects Slack integration for a tenant.
 */
router.delete(
  "/disconnect",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId } = req.query as { tenantId?: string };

      if (!tenantId) {
        res.status(400).json({ error: "tenantId is required" });
        return;
      }

      await disconnectSlack(tenantId);

      res.json({
        message: `Slack disconnected for tenant "${tenantId}"`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * GET /api/slack/status?tenantId=alice@example.com
 * Check Slack connection status for a tenant.
 */
router.get("/status", async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.query as { tenantId?: string };

    if (!tenantId) {
      res.status(400).json({ error: "tenantId is required" });
      return;
    }

    const integration = await prisma.slackIntegration.findUnique({
      where: { tenantId },
    });

    res.json({
      connected: !!integration,
      tenantId,
      teamName: integration?.teamName || null,
      connectedAt: integration?.createdAt || null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

