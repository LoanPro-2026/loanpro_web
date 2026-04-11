import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { resetRateLimit, RateLimitPresets } from '@/lib/rateLimit';
import { connectToDatabase } from '@/lib/mongodb';
import { getCorsHeaders, handleCorsPreFlight } from '@/lib/cors';
import { logger } from '@/lib/logger';
import { enforceRequestRateLimit, parseJsonRequest, toSafeErrorResponse } from '@/lib/apiSafety';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for') || '';
  const realIp = request.headers.get('x-real-ip') || '';
  const candidate = forwardedFor.split(',')[0]?.trim() || realIp.trim() || 'unknown';
  return candidate.slice(0, 80);
}

function timingSafeEqualText(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  const applyCors = (response: NextResponse) => {
    Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value));
    return response;
  };

  try {
    const parsedBody = await parseJsonRequest<Record<string, unknown>>(request, { maxBytes: 32 * 1024 });
    if (!parsedBody.ok) {
      return applyCors(parsedBody.response);
    }

    const { email, password } = parsedBody.data;
    const clientIp = getClientIp(request);
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPassword = String(password || '');

    // Validate input
    if (!normalizedEmail || !normalizedPassword) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const rateLimitKey = `admin:login:ip:${clientIp}`;
    const rateLimitResponse = enforceRequestRateLimit({
      request,
      scope: 'admin-login',
      limit: RateLimitPresets.AUTH.limit,
      windowMs: RateLimitPresets.AUTH.windowMs,
    });
    if (rateLimitResponse) {
      return applyCors(rateLimitResponse);
    }

    // Check against admin credentials from environment
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;

    if (!adminEmail || !adminPassword || !jwtSecret) {
      return NextResponse.json(
        { error: 'Admin configuration is incomplete' },
        { status: 500, headers: corsHeaders }
      );
    }

    const { db } = await connectToDatabase();
    const securityCollection = db.collection('admin_login_security');
    const now = new Date();
    const securityKey = `${adminEmail}:${clientIp}`;
    const securityRecord = await securityCollection.findOne({ key: securityKey });

    if (securityRecord?.lockUntil && new Date(securityRecord.lockUntil) > now) {
      const retryAfterSeconds = Math.ceil((new Date(securityRecord.lockUntil).getTime() - now.getTime()) / 1000);
      return NextResponse.json(
        { error: 'Account temporarily locked due to repeated failed attempts.', retryAfterSeconds },
        { status: 429, headers: corsHeaders }
      );
    }

    // Verify credentials
    const emailMatches = timingSafeEqualText(normalizedEmail, adminEmail);
    const passwordMatches = timingSafeEqualText(normalizedPassword, adminPassword);

    if (!emailMatches || !passwordMatches) {
      const isFreshWindow =
        !securityRecord?.firstFailedAt ||
        now.getTime() - new Date(securityRecord.firstFailedAt).getTime() > FAILURE_WINDOW_MS;
      const nextFailedCount = isFreshWindow ? 1 : (securityRecord?.failedCount || 0) + 1;
      const lockUntil = nextFailedCount >= MAX_FAILED_ATTEMPTS ? new Date(now.getTime() + LOCKOUT_MS) : null;

      await securityCollection.updateOne(
        { key: securityKey },
        {
          $set: {
            key: securityKey,
            email: adminEmail,
            ip: clientIp,
            failedCount: nextFailedCount,
            firstFailedAt: isFreshWindow ? now : securityRecord?.firstFailedAt || now,
            lastFailedAt: now,
            lockUntil,
            updatedAt: now,
          },
        },
        { upsert: true }
      );

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401, headers: corsHeaders }
      );
    }

    await securityCollection.deleteOne({ key: securityKey });
    resetRateLimit(rateLimitKey);

    // Generate JWT token (expires in 24 hours)
    const token = jwt.sign(
      {
        email: normalizedEmail,
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    return NextResponse.json({
      success: true,
      token,
      email: normalizedEmail,
      expiresIn: '24h',
      message: 'Admin login successful'
    }, { status: 200, headers: corsHeaders });

  } catch (error) {
    logger.error('Admin login error', error, 'ADMIN_LOGIN');
    return applyCors(toSafeErrorResponse(error, 'ADMIN_LOGIN', 'Login failed'));
  }
}

// Health check
export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);

  return NextResponse.json({
    status: 'ok',
    message: 'Admin login endpoint active'
  }, { headers: corsHeaders });
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request);
}
