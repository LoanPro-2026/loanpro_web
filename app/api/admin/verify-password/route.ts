import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { enforceAdminAccess, getAdminErrorStatus } from '@/lib/adminAuth';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  throw new Error('ADMIN_PASSWORD environment variable must be set');
}

function timingSafeEqualText(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  try {
    await enforceAdminAccess(request, {
      permission: 'dashboard:read',
      rateLimitKey: 'verify-password:post',
      limit: 15,
      windowMs: 60_000,
    });

    // Then verify the password
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }

    if (!timingSafeEqualText(password, ADMIN_PASSWORD)) {
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password verified successfully'
    });
  } catch (error: unknown) {
    console.error('Error verifying password:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to verify password' 
      },
      { status: getAdminErrorStatus(error) }
    );
  }
}
