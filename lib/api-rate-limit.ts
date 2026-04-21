import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

function createRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.UPSTASH_REDIS_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.UPSTASH_REDIS_TOKEN;
  if (!url || !token) {
    return null;
  }
  return new Redis({ url, token });
}

const redis = createRedis();

const analyseNotamsRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(1, "5 m"),
      prefix: "ratelimit:analyse-notams",
    })
  : null;

const parseFlightPlanRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(1, "5 m"),
      prefix: "ratelimit:parse-flight-plan",
    })
  : null;

type RateLimitResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

async function enforceUserRateLimit(
  userId: string,
  ratelimit: Ratelimit | null,
): Promise<RateLimitResult> {
  if (!ratelimit) {
    return { ok: true };
  }

  try {
    const { success } = await ratelimit.limit(userId);

    if (!success) {
      return {
        ok: false,
        response: NextResponse.json(
          { ok: false as const, error: "Too many requests" },
          { status: 429 },
        ),
      };
    }
  } catch (error) {
    console.error("Rate limit check failed:", error);
  }

  return { ok: true };
}

export function enforceAnalyseNotamsRateLimit(userId: string): Promise<RateLimitResult> {
  return enforceUserRateLimit(userId, analyseNotamsRatelimit);
}

export function enforceParseFlightPlanRateLimit(userId: string): Promise<RateLimitResult> {
  return enforceUserRateLimit(userId, parseFlightPlanRatelimit);
}
