import https from "https";
import http from "http";
import prisma from "../db";
import { config } from "../config";

/**
 * Slack Service — handles OAuth and notifications.
 *
 * Flow:
 * 1. User clicks "Connect Slack" → redirected to Slack OAuth authorize URL
 * 2. Slack redirects back with code → we exchange for access token
 * 3. Token is stored in DB per tenantId (sender/org)
 * 4. When rate limit is hit, we send a Slack message via chat.postMessage
 */

/**
 * Generate the Slack OAuth authorization URL.
 */
export function getSlackAuthUrl(tenantId: string): string {
  const scopes = "chat:write,channels:read";
  const params = new URLSearchParams({
    client_id: config.slack.clientId,
    scope: scopes,
    redirect_uri: config.slack.redirectUri,
    state: tenantId, // Pass tenantId through the OAuth flow
  });
  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

/**
 * Exchange an OAuth code for an access token and store it.
 */
export async function handleSlackCallback(
  code: string,
  tenantId: string
): Promise<{ teamName: string }> {
  const params = new URLSearchParams({
    client_id: config.slack.clientId,
    client_secret: config.slack.clientSecret,
    code,
    redirect_uri: config.slack.redirectUri,
  });

  const response = await fetchJson(
    `https://slack.com/api/oauth.v2.access?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Slack OAuth failed: ${response.error}`);
  }

  const accessToken = response.access_token;
  const teamName = response.team?.name || "Unknown Team";
  const botUserId = response.bot_user_id || null;

  // Upsert the integration for this tenant
  await prisma.slackIntegration.upsert({
    where: { tenantId },
    update: {
      accessToken,
      teamName,
      botUserId,
      updatedAt: new Date(),
    },
    create: {
      tenantId,
      accessToken,
      teamName,
      botUserId,
    },
  });

  console.log(
    `[SlackService] Connected tenant "${tenantId}" to Slack workspace "${teamName}"`
  );

  return { teamName };
}

/**
 * Disconnect Slack for a tenant.
 */
export async function disconnectSlack(tenantId: string): Promise<void> {
  await prisma.slackIntegration.deleteMany({
    where: { tenantId },
  });
  console.log(`[SlackService] Disconnected Slack for tenant "${tenantId}"`);
}

/**
 * Send a rate-limit notification to Slack for a given tenant/sender.
 * Gracefully no-ops if Slack is not connected.
 */
export async function notifyRateLimitHit(
  sender: string,
  currentCount: number,
  limit: number
): Promise<void> {
  try {
    const integration = await prisma.slackIntegration.findUnique({
      where: { tenantId: sender },
    });

    if (!integration) {
      console.log(
        `[SlackService] No Slack integration for sender "${sender}" — skipping notification`
      );
      return;
    }

    // Find a channel to post to. If no channelId stored, post to #general.
    let channelId = integration.channelId;

    if (!channelId) {
      // Try to find #general or the first available channel
      const channelsResponse = await fetchJsonWithAuth(
        "https://slack.com/api/conversations.list?types=public_channel&limit=100",
        integration.accessToken
      );

      if (channelsResponse.ok && channelsResponse.channels?.length > 0) {
        const general = channelsResponse.channels.find(
          (c: any) => c.name === "general"
        );
        channelId = general?.id || channelsResponse.channels[0].id;

        // Cache it
        await prisma.slackIntegration.update({
          where: { id: integration.id },
          data: { channelId },
        });
      }
    }

    if (!channelId) {
      console.warn(
        `[SlackService] Could not find a channel for sender "${sender}"`
      );
      return;
    }

    const message = {
      channel: channelId,
      text: `🚨 *Rate Limit Hit* — Sender \`${sender}\` has reached the hourly email limit (${currentCount}/${limit}). Outgoing emails for this sender will be delayed until the next hour window.`,
    };

    const postResult = await postJsonWithAuth(
      "https://slack.com/api/chat.postMessage",
      message,
      integration.accessToken
    );

    if (postResult.ok) {
      console.log(
        `[SlackService] Sent rate-limit notification to Slack for sender "${sender}"`
      );
    } else {
      console.warn(
        `[SlackService] Failed to post Slack message: ${postResult.error}`
      );
    }
  } catch (err: any) {
    // Never crash the worker due to a Slack notification failure
    console.error(
      `[SlackService] Error sending Slack notification for "${sender}":`,
      err.message
    );
  }
}

// ─── HTTP Helpers (no external deps needed) ──────────────────────────────────

function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    lib
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error(`Invalid JSON from ${url}`));
          }
        });
      })
      .on("error", reject);
  });
}

function fetchJsonWithAuth(url: string, token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    };
    const lib = url.startsWith("https") ? https : http;
    const req = lib.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error(`Invalid JSON from ${url}`));
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

function postJsonWithAuth(
  url: string,
  body: any,
  token: string
): Promise<any> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname,
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(postData),
      },
    };
    const lib = url.startsWith("https") ? https : http;
    const req = lib.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error(`Invalid JSON from ${url}`));
        }
      });
    });
    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

