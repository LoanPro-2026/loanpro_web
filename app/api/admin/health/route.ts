import { NextRequest, NextResponse } from 'next/server';
import { enforceAdminAccess, getAdminErrorStatus } from '@/lib/adminAuth';
import { connectToDatabase } from '@/lib/mongodb';
import { getAdminCachedResponse, setAdminCachedResponse } from '@/lib/adminResponseCache';

export async function GET(request: NextRequest) {
  try {
    await enforceAdminAccess(request, {
      permission: 'health:read',
      rateLimitKey: 'health:get',
      limit: 30,
      windowMs: 60_000,
    });
    const cacheKey = 'admin:health:get:v1';
    const cached = getAdminCachedResponse<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const start = Date.now();

    const { db } = await connectToDatabase();
    await db.command({ ping: 1 });

    const [users, subscriptions, payments, openIncidents, lastReconciliationRun] = await Promise.all([
      db.collection('users').countDocuments(),
      db.collection('subscriptions').countDocuments(),
      db.collection('payments').countDocuments(),
      db.collection('payment_incidents').countDocuments({ status: 'open' }),
      db.collection('payment_reconciliation_runs').find().sort({ createdAt: -1 }).limit(1).next(),
    ]);

    const latencyMs = Date.now() - start;

    const payload = {
      success: true,
      status: latencyMs < 1000 ? 'healthy' : 'degraded',
      latencyMs,
      collections: {
        users,
        subscriptions,
        payments,
      },
      incidents: {
        open: openIncidents,
      },
      reconciliation: {
        lastRun: lastReconciliationRun || null,
      },
      serverTime: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    };

    setAdminCachedResponse(cacheKey, payload, 10_000, ['health', 'dashboard']);

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { success: false, status: 'down', error: error instanceof Error ? error.message : 'Health check failed' },
      { status: getAdminErrorStatus(error) }
    );
  }
}
