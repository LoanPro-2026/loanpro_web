import { NextRequest, NextResponse } from 'next/server';
import { enforceAdminAccess, getAdminErrorStatus } from '@/lib/adminAuth';
import { connectToDatabase } from '@/lib/mongodb';
import { getAdminCachedResponse, setAdminCachedResponse } from '@/lib/adminResponseCache';

export async function GET(request: NextRequest) {
  try {
    await enforceAdminAccess(request, {
      permission: 'integrations:read',
      rateLimitKey: 'integrations:get',
      limit: 30,
      windowMs: 60_000,
    });

    const cacheKey = 'admin:integrations:get:v1';
    const cached = getAdminCachedResponse<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const integrations = [
      {
        key: 'mongodb',
        name: 'MongoDB',
        configured: Boolean(process.env.MONGODB_URI),
        status: 'unknown' as 'healthy' | 'degraded' | 'down' | 'unknown',
        details: '',
      },
      {
        key: 'clerk',
        name: 'Clerk Auth',
        configured: Boolean(process.env.CLERK_SECRET_KEY),
        status: 'unknown' as 'healthy' | 'degraded' | 'down' | 'unknown',
        details: '',
      },
      {
        key: 'razorpay',
        name: 'Razorpay',
        configured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
        status: 'unknown' as 'healthy' | 'degraded' | 'down' | 'unknown',
        details: '',
      },
      {
        key: 'email',
        name: 'Brevo Email',
        configured: Boolean(process.env.BREVO_API_KEY),
        status: 'unknown' as 'healthy' | 'degraded' | 'down' | 'unknown',
        details: '',
      },
    ];

    try {
      const { db } = await connectToDatabase();
      await db.command({ ping: 1 });
      integrations[0].status = 'healthy';
      integrations[0].details = 'Database ping successful';
    } catch {
      integrations[0].status = 'down';
      integrations[0].details = 'Database connection failed';
    }

    integrations[1].status = integrations[1].configured ? 'healthy' : 'degraded';
    integrations[1].details = integrations[1].configured ? 'Clerk secret configured' : 'Missing CLERK_SECRET_KEY';

    integrations[2].status = integrations[2].configured ? 'healthy' : 'degraded';
    integrations[2].details = integrations[2].configured ? 'Razorpay keys configured' : 'Missing Razorpay keys';

    integrations[3].status = integrations[3].configured ? 'healthy' : 'degraded';
    integrations[3].details = integrations[3].configured ? 'Email provider configured' : 'Missing BREVO_API_KEY';

    const summary = {
      healthy: integrations.filter((item) => item.status === 'healthy').length,
      degraded: integrations.filter((item) => item.status === 'degraded').length,
      down: integrations.filter((item) => item.status === 'down').length,
      total: integrations.length,
    };

    const payload = { success: true, integrations, summary };
    setAdminCachedResponse(cacheKey, payload, 30_000, ['integrations', 'health']);

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch integrations' },
      { status: getAdminErrorStatus(error) }
    );
  }
}
