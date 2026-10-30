import { Router, Request, Response } from "express";
import { searchEmails } from "../services/elasticService";

const router = Router();

/**
 * GET /api/search
 * Search emails via Elasticsearch.
 *
 * Query params:
 *   q      — free-text search query (searches subject, body, sender, recipient)
 *   sender — filter by sender email
 *   status — filter by status (SCHEDULED, QUEUED, SENDING, SENT, FAILED)
 *   from   — pagination offset (default 0)
 *   size   — results per page (default 20)
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      q = "",
      sender,
      status,
      from = "0",
      size = "20",
    } = req.query as Record<string, string>;

    // STRICT MULTI-TENANT SEARCH ISOLATION:
    if (!sender || !sender.trim()) {
      res.json({
        query: q,
        total: 0,
        from: 0,
        size: 0,
        hits: [],
      });
      return;
    }

    const result = await searchEmails(q, {
      from: parseInt(from, 10),
      size: Math.min(100, parseInt(size, 10)),
      sender: sender.toLowerCase().trim(),
      status,
    });

    res.json({
      query: q,
      total: result.total,
      from: parseInt(from, 10),
      size: parseInt(size, 10),
      hits: result.hits,
    });
  } catch (err: any) {
    console.error("[API] Search error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

