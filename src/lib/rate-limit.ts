// lib/rate-limit.ts
// Simple in-memory rate limiting for API routes

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Cleanup old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 10 * 60 * 1000);

export interface RateLimitConfig {
  interval: number; // in milliseconds
  maxRequests: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Simple rate limiter using in-memory storage
 * For production, consider using Redis or Upstash
 */
export function rateLimit(config: RateLimitConfig) {
  return {
    check: (identifier: string): RateLimitResult => {
      const now = Date.now();
      const key = `${identifier}`;
      
      // Initialize or reset if expired
      if (!store[key] || store[key].resetTime < now) {
        store[key] = {
          count: 0,
          resetTime: now + config.interval,
        };
      }

      // Increment count
      store[key].count++;

      const success = store[key].count <= config.maxRequests;
      const remaining = Math.max(0, config.maxRequests - store[key].count);

      return {
        success,
        limit: config.maxRequests,
        remaining,
        reset: store[key].resetTime,
      };
    },
  };
}

// Helper to get client IP from request
export function getClientIp(request: Request): string {
  // Try to get IP from various headers (for proxies/load balancers)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to a generic identifier
  return 'unknown';
}

// Pre-configured rate limiters
export const rateLimiters = {
  // Scraping: 10 requests per hour
  scrape: rateLimit({
    interval: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
  }),

  // Analysis: 20 requests per hour
  analyze: rateLimit({
    interval: 60 * 60 * 1000, // 1 hour
    maxRequests: 20,
  }),

  // Posts: 60 requests per minute
  posts: rateLimit({
    interval: 60 * 1000, // 1 minute
    maxRequests: 60,
  }),

  // Health: 100 requests per minute
  health: rateLimit({
    interval: 60 * 1000, // 1 minute
    maxRequests: 100,
  }),
};
