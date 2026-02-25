import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { checkRateLimit, resetRateLimit, RateLimitPresets } from '@/lib/rateLimit';
import { connectToDatabase } from '@/lib/mongodb';

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
  try {
    const { email, password } = await request.json();
    const clientIp = getClientIp(request);
    const normalizedEmail = String(email || '').trim().toLowerCase();

    // Validate input
    if (!normalizedEmail || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const rateLimitKey = `admin:login:ip:${clientIp}`;
    if (!checkRateLimit(rateLimitKey, RateLimitPresets.AUTH.limit, RateLimitPresets.AUTH.windowMs)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Check against admin credentials from environment
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;

    if (!adminEmail || !adminPassword || !jwtSecret) {
      return NextResponse.json(
        { error: 'Admin configuration is incomplete' },
        { status: 500 }
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
        { status: 429 }
      );
    }

    // Verify credentials
    const emailMatches = timingSafeEqualText(normalizedEmail, adminEmail);
    const passwordMatches = timingSafeEqualText(password, adminPassword);

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
        { status: 401 }
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
    }, { status: 200 });

  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}

// Health check
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'Admin login endpoint active'
  });
}
