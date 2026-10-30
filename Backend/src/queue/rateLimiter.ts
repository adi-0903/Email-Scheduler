import Redis from "ioredis";
import { config } from "../config";

const redis = config.redisUrl
  ? new Redis(config.redisUrl, { maxRetriesPerRequest: null })
  : new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      maxRetriesPerRequest: null,
    });

/**
 * Redis-backed per-sender rate limiter.
 *
 * Uses a sliding window approach keyed by `rate_limit:{sender}:{hourWindow}`.
 * The hourWindow is `Math.floor(Date.now() / 3600000)` — i.e. resets every hour.
 *
 * Thread-safe across multiple workers/instances because Redis INCR is atomic.
 */
export async function checkAndIncrementRateLimit(
  sender: string
): Promise<{ allowed: boolean; currentCount: number; msUntilNextWindow: number }> {
  const now = Date.now();
  const hourWindow = Math.floor(now / 3_600_000);
  const key = `rate_limit:${sender}:${hourWindow}`;

  // Atomic increment
  const currentCount = await redis.incr(key);

  // Set TTL on first increment (key didn't exist before)
  if (currentCount === 1) {
    await redis.expire(key, 3600); // Expire after 1 hour
  }

  const msUntilNextWindow =
    (hourWindow + 1) * 3_600_000 - now;

  if (currentCount > config.maxEmailsPerHourPerSender) {
    // Decrement back since we won't actually send
    await redis.decr(key);
    return {
      allowed: false,
      currentCount: currentCount - 1,
      msUntilNextWindow,
    };
  }

  return {
    allowed: true,
    currentCount,
    msUntilNextWindow,
  };
}

/**
 * Get the current count for a sender in the current hour window.
 */
export async function getCurrentRateCount(sender: string): Promise<number> {
  const hourWindow = Math.floor(Date.now() / 3_600_000);
  const key = `rate_limit:${sender}:${hourWindow}`;
  const count = await redis.get(key);
  return count ? parseInt(count, 10) : 0;
}

export { redis as rateLimitRedis };

