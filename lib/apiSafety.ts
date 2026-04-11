import { NextResponse } from 'next/server';
import { ApiErrors, errorResponse } from '@/lib/apiResponse';
import { checkRateLimit, getRateLimitInfo } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';

interface RequestRateLimitOptions {
  request: Request;
  scope: string;
  limit: number;
  windowMs: number;
  userId?: string | null;
}

interface ParseJsonOptions {
  maxBytes?: number;
  requireJsonContentType?: boolean;
}

interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  operation: string;
  context: string;
}

type ParseJsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRequestIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  return 'unknown';
}

function looksTransient(error: unknown): boolean {
  const err = error as { code?: string; statusCode?: number; message?: string } | null;
  if (!err) return false;

  const code = String(err.code || '').toUpperCase();
  if (['ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN', 'ECONNREFUSED'].includes(code)) {
    return true;
  }

  if ([408, 429, 502, 503, 504].includes(Number(err.statusCode || 0))) {
    return true;
  }

  const message = String(err.message || '').toLowerCase();
  return (
    message.includes('timeout') ||
    message.includes('temporarily unavailable') ||
    message.includes('network')
  );
}

export function enforceRequestRateLimit(options: RequestRateLimitOptions): NextResponse | null {
  const ip = getRequestIp(options.request);
  const identity = options.userId ? `user:${options.userId}` : `ip:${ip}`;
  const key = `${options.scope}:${identity}`;

  const allowed = checkRateLimit(key, options.limit, options.windowMs);
  if (allowed) return null;

  const info = getRateLimitInfo(key, options.limit);
  const retryAfterSeconds = Math.max(1, Math.ceil((info.resetTime - Date.now()) / 1000));
  const response = errorResponse(ApiErrors.RATE_LIMIT);
  response.headers.set('Retry-After', String(retryAfterSeconds));
  response.headers.set('X-RateLimit-Limit', String(options.limit));
  response.headers.set('X-RateLimit-Remaining', String(info.remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.floor(info.resetTime / 1000)));

  logger.warn('API request rate limited', 'API_SAFETY', {
    scope: options.scope,
    identity,
    ip,
    retryAfterSeconds,
  });

  return response;
}

export async function parseJsonRequest<T = Record<string, unknown>>(
  request: Request,
  options: ParseJsonOptions = {}
): Promise<ParseJsonResult<T>> {
  const maxBytes = options.maxBytes ?? 128 * 1024;
  const requireJsonContentType = options.requireJsonContentType ?? true;
  const contentType = request.headers.get('content-type') || '';

  if (requireJsonContentType && !contentType.toLowerCase().includes('application/json')) {
    return {
      ok: false,
      response: errorResponse({
        code: 'INVALID_CONTENT_TYPE',
        message: 'Content-Type must be application/json',
        statusCode: 415,
      }),
    };
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return {
      ok: false,
      response: errorResponse({
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Payload too large',
        statusCode: 413,
      }),
    };
  }

  try {
    const body = (await request.json()) as T;
    return { ok: true, data: body };
  } catch {
    return {
      ok: false,
      response: errorResponse({
        code: 'INVALID_JSON',
        message: 'Invalid JSON in request body',
        statusCode: 400,
      }),
    };
  }
}

export async function withRecovery<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 2);
  const baseDelayMs = Math.max(50, options.baseDelayMs ?? 250);
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const retryable = looksTransient(error);
      const isLastAttempt = attempt >= attempts;

      logger.warn('Recoverable API operation failed', options.context, {
        operation: options.operation,
        attempt,
        attempts,
        retryable,
        error: error instanceof Error ? error.message : String(error),
      });

      if (!retryable || isLastAttempt) {
        throw error;
      }

      await sleep(baseDelayMs * attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Recovery operation failed');
}

export function toSafeErrorResponse(
  error: unknown,
  context: string,
  publicMessage: string = 'Request failed. Please try again.'
): NextResponse {
  logger.error('Unhandled API error', error, context);

  if (error instanceof Error) {
    const statusCode = (error as Error & { statusCode?: number }).statusCode;
    if (statusCode && statusCode >= 400 && statusCode < 500) {
      return errorResponse({
        code: 'REQUEST_ERROR',
        message: error.message,
        statusCode,
      });
    }
  }

  return errorResponse({
    code: ApiErrors.INTERNAL_ERROR.code,
    message: publicMessage,
    statusCode: ApiErrors.INTERNAL_ERROR.statusCode,
  });
}
