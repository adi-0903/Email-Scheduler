import dotenv from "dotenv";
dotenv.config();

/**
 * Parse a Redis URL into host/port/password components.
 * Supports: redis://user:password@host:port
 */
function parseRedisUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port, 10) || 6379,
    password: parsed.password || undefined,
    username: parsed.username !== "default" ? parsed.username : undefined,
  };
}

// Build Redis connection config from URL or individual vars
const redisConfig = process.env.REDIS_URL
  ? {
      ...parseRedisUrl(process.env.REDIS_URL),
      maxRetriesPerRequest: null as null,
    }
  : {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379", 10),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null as null,
    };

export const config = {
  // Server
  port: parseInt(process.env.PORT || "3000", 10),
  baseUrl: process.env.BASE_URL || "http://localhost:3000",

  // Redis
  redis: redisConfig,
  redisUrl: process.env.REDIS_URL || undefined,

  // Elasticsearch
  elasticsearchUrl: process.env.ELASTICSEARCH_URL || "http://localhost:9200",

  // Worker
  workerConcurrency: parseInt(process.env.WORKER_CONCURRENCY || "5", 10),
  minDelayBetweenSendsMs: parseInt(
    process.env.MIN_DELAY_BETWEEN_SENDS_MS || "2000",
    10
  ),

  // Rate limiting
  maxEmailsPerHourPerSender: parseInt(
    process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || "200",
    10
  ),

  // Slack OAuth
  slack: {
    clientId: process.env.SLACK_CLIENT_ID || "",
    clientSecret: process.env.SLACK_CLIENT_SECRET || "",
    redirectUri:
      process.env.SLACK_REDIRECT_URI ||
      "http://localhost:3000/api/slack/callback",
  },
};
