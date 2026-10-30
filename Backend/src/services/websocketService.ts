import http from "http";
import { WebSocketServer, WebSocket } from "ws";

export type RealtimeEvent =
  | {
      type: "email:scheduled";
      data: {
        campaignId: string;
        jobId: string;
        email: string;
        scheduledTime: string;
      };
    }
  | {
      type: "email:sending";
      data: {
        campaignId: string;
        jobId: string;
        email: string;
      };
    }
  | {
      type: "email:sent";
      data: {
        campaignId: string;
        jobId: string;
        email: string;
        sentTime: string;
        messageId: string;
        previewUrl?: string | false;
      };
    }
  | {
      type: "email:failed";
      data: {
        campaignId: string;
        jobId: string;
        email: string;
        reason: string;
        failedTime: string;
      };
    }
  | {
      type: "campaign:progress";
      data: {
        campaignId: string;
        total: number;
        sentCount: number;
        failedCount: number;
        remainingCount: number;
      };
    };

let wss: WebSocketServer | null = null;

export function initWebSocketServer(server: http.Server): WebSocketServer {
  wss = new WebSocketServer({ server, path: "/ws/delivery" });

  wss.on("connection", (ws: WebSocket) => {
    console.log("[WebSocket] Client connected to /ws/delivery");

    ws.on("message", (msg) => {
      try {
        const text = msg.toString();
        if (text === "ping") {
          ws.send("pong");
        }
      } catch {}
    });

    ws.on("close", () => {
      console.log("[WebSocket] Client disconnected");
    });
  });

  return wss;
}

export function broadcast(event: RealtimeEvent): void {
  if (!wss) return;

  const payload = JSON.stringify(event);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
      } catch (err: any) {
        console.error("[WebSocket] Broadcast error:", err.message);
      }
    }
  });
}

