import { NextRequest, NextResponse } from 'next/server';
import { enforceAdminAccess, getAdminErrorStatus } from '@/lib/adminAuth';
import { connectToDatabase } from '@/lib/mongodb';
import { getAdminCachedResponse, setAdminCachedResponse } from '@/lib/adminResponseCache';

export async function GET(request: NextRequest) {
  try {
    await enforceAdminAccess(request, {
      permission: 'audit:read',
      rateLimitKey: 'audit:get',
      limit: 40,
      windowMs: 60_000,
    });

    const url = new URL(request.url);
    const cacheKey = `admin:audit:get:v1:${url.searchParams.toString()}`;
    const cached = getAdminCachedResponse<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const page = Math.max(Number(url.searchParams.get('page') || '1'), 1);
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || '50'), 1), 200);
    const action = (url.searchParams.get('action') || '').trim();

    const { db } = await connectToDatabase();

    const filter: Record<string, unknown> = {};
    if (action) filter.action = action;

    const [total, logs] = await Promise.all([
      db.collection('admin_audit_logs').countDocuments(filter),
      db
        .collection('admin_audit_logs')
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
    ]);

    const payload = {
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    setAdminCachedResponse(cacheKey, payload, 15_000, ['audit']);

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch audit logs' },
      { status: getAdminErrorStatus(error) }
    );
  }
}
