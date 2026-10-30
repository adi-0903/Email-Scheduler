import { Client } from "@elastic/elasticsearch";
import { config } from "../config";

const esClient = new Client({
  node: config.elasticsearchUrl,
  requestTimeout: 5000, // 5 second timeout to avoid blocking startup
});

const INDEX_NAME = "emails";

/**
 * Create the emails index with appropriate mappings if it doesn't exist.
 */
export async function ensureIndex(): Promise<void> {
  try {
    const exists = await esClient.indices.exists({ index: INDEX_NAME });
    if (!exists) {
      await esClient.indices.create({
        index: INDEX_NAME,
        body: {
          mappings: {
            properties: {
              id: { type: "keyword" },
              sender: { type: "keyword" },
              recipient: { type: "keyword" },
              subject: { type: "text", analyzer: "standard" },
              body: { type: "text", analyzer: "standard" },
              status: { type: "keyword" },
              scheduledAt: { type: "date" },
              sentAt: { type: "date" },
              createdAt: { type: "date" },
            },
          },
        },
      });
      console.log("[Elasticsearch] Created index:", INDEX_NAME);
    }
  } catch (err: any) {
    console.error("[Elasticsearch] Failed to ensure index:", err.message);
  }
}

/**
 * Index (upsert) an email document into Elasticsearch.
 */
export async function indexEmail(email: {
  id: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: Date | string;
  sentAt?: Date | string | null;
  createdAt: Date | string;
}): Promise<void> {
  try {
    await esClient.index({
      index: INDEX_NAME,
      id: email.id,
      body: {
        id: email.id,
        sender: email.sender,
        recipient: email.recipient,
        subject: email.subject,
        body: email.body,
        status: email.status,
        scheduledAt: email.scheduledAt,
        sentAt: email.sentAt || null,
        createdAt: email.createdAt,
      },
      refresh: true, // Make immediately searchable
    });
  } catch (err: any) {
    console.error("[Elasticsearch] Failed to index email:", email.id, err.message);
  }
}

/**
 * Search emails by a free-text query across subject, body, sender, and recipient.
 */
export async function searchEmails(
  query: string,
  options: { from?: number; size?: number; sender?: string; status?: string } = {}
): Promise<{ total: number; hits: any[] }> {
  const { from = 0, size = 20, sender, status } = options;

  const must: any[] = [];
  const filter: any[] = [];

  if (query && query.trim()) {
    must.push({
      multi_match: {
        query,
        fields: ["subject^2", "body", "sender", "recipient"],
        fuzziness: "AUTO",
      },
    });
  } else {
    must.push({ match_all: {} });
  }

  if (sender) {
    filter.push({ term: { sender } });
  }

  if (status) {
    filter.push({ term: { status } });
  }

  try {
    const result = await esClient.search({
      index: INDEX_NAME,
      body: {
        from,
        size,
        query: {
          bool: {
            must,
            filter,
          },
        },
        sort: [{ scheduledAt: { order: "desc" } }],
      },
    });

    const total =
      typeof result.hits.total === "number"
        ? result.hits.total
        : result.hits.total?.value || 0;

    return {
      total,
      hits: result.hits.hits.map((hit: any) => ({
        _id: hit._id,
        _score: hit._score,
        ...hit._source,
      })),
    };
  } catch (err: any) {
    console.error("[Elasticsearch] Search failed:", err.message);
    return { total: 0, hits: [] };
  }
}

export { esClient };

