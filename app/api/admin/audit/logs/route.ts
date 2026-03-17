import { NextRequest, NextResponse } from 'next/server';
import { enforceAdminAccess, getAdminErrorStatus } from '@/lib/adminAuth';
import { connectToDatabase } from '@/lib/mongodb';
import { invalidateAdminCacheByTags } from '@/lib/adminResponseCache';

type IncomingAuditLog = {
  id?: string;
  timestamp?: string;
  adminEmail?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  status?: 'success' | 'failure' | string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
};

export async function POST(request: NextRequest) {
  try {
    const admin = await enforceAdminAccess(request, {
      permission: 'audit:read',
      rateLimitKey: 'audit:logs:post',
      limit: 120,
      windowMs: 60_000,
    });

    const body = await request.json().catch(() => ({}));
    const logs = Array.isArray(body?.logs) ? (body.logs as IncomingAuditLog[]) : [];

    if (!logs.length) {
      return NextResponse.json({ success: true, inserted: 0 });
    }

    const now = new Date();
    const docs = logs.slice(0, 100).map((entry) => ({
      actorEmail: String(entry.adminEmail || admin.email).trim() || admin.email,
      action: String(entry.action || 'unknown').slice(0, 120),
      targetType: String(entry.resourceType || 'admin_ui').slice(0, 120),
      targetId: entry.resourceId ? String(entry.resourceId).slice(0, 200) : null,
      details: {
        source: 'admin-client-buffer',
        clientLogId: entry.id || null,
        status: entry.status || 'success',
        resourceName: entry.resourceName || null,
        errorMessage: entry.errorMessage || null,
        metadata: entry.metadata || {},
        clientTimestamp: entry.timestamp || null,
      },
      createdAt: now,
    }));

    const { db } = await connectToDatabase();
    const result = await db.collection('admin_audit_logs').insertMany(docs, { ordered: false });

    invalidateAdminCacheByTags(['audit']);

    return NextResponse.json({ success: true, inserted: result.insertedCount });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to ingest audit logs' },
      { status: getAdminErrorStatus(error) }
    );
  }
}
