// src/lib/ratelimit.ts
// Upstash Redis-backed rate limiting for expensive endpoints and auth.
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Agreement generation: 5 requests per tenancy per hour
export const agreementGenerateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  prefix: 'rl:agreement:generate',
  analytics: true,
});

// AI assist: 10 requests per agreement per hour
export const agreementAssistLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 h'),
  prefix: 'rl:agreement:assist',
  analytics: true,
});

// Login: 5 attempts per email per 15 minutes (IMP-14)
export const loginRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'),
  prefix: 'rl:login',
  analytics: true,
});
