/**
 * Simple rate limiting for API routes
 * Prevents abuse and DDoS attacks
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory rate limit store (for single server)
// For production with multiple servers, use Redis
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (user ID, IP, etc.)
 * @param limit - Max requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns true if request should be allowed, false if rate limited
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60000 // 1 minute default
): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetTime) {
    // Create new entry
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }

  if (entry.count >= limit) {
    return false; // Rate limited
  }

  entry.count++;
  return true; // Request allowed
}

/**
 * Get rate limit information
 */
export function getRateLimitInfo(
  identifier: string,
  limit: number = 100
): { remaining: number; resetTime: number; isLimited: boolean } {
  const entry = rateLimitStore.get(identifier);
  const now = Date.now();

  if (!entry || now > entry.resetTime) {
    return {
      remaining: limit,
      resetTime: now + 60000,
      isLimited: false,
    };
  }

  return {
    remaining: Math.max(0, limit - entry.count),
    resetTime: entry.resetTime,
    isLimited: entry.count >= limit,
  };
}

/**
 * Reset rate limit for identifier
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Cleanup old entries (call periodically to prevent memory leak)
 */
export function cleanupRateLimit(): void {
  const now = Date.now();

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Cleanup every 5 minutes
if (typeof global !== 'undefined') {
  setInterval(cleanupRateLimit, 5 * 60 * 1000);
}

/**
 * Common rate limit presets
 */
export const RateLimitPresets = {
  // Auth routes - stricter limits
  AUTH: { limit: 5, windowMs: 15 * 60 * 1000 }, // 5 requests per 15 minutes

  // Payment routes - medium limits
  PAYMENT: { limit: 10, windowMs: 60 * 1000 }, // 10 requests per minute

  // General API - standard limits
  API: { limit: 100, windowMs: 60 * 1000 }, // 100 requests per minute

  // Search/List endpoints - higher limits
  LIST: { limit: 50, windowMs: 60 * 1000 }, // 50 requests per minute
};
