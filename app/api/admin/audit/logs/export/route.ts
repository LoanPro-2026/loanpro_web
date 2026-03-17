import { NextRequest, NextResponse } from 'next/server';
import { enforceAdminAccess, getAdminErrorStatus } from '@/lib/adminAuth';
import { connectToDatabase } from '@/lib/mongodb';

function escapeCsv(value: unknown): string {
  const text = String(value ?? '');
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export async function GET(request: NextRequest) {
  try {
    await enforceAdminAccess(request, {
      permission: 'audit:read',
      rateLimitKey: 'audit:logs:export:get',
      limit: 20,
      windowMs: 60_000,
    });

    const url = new URL(request.url);
    const action = (url.searchParams.get('action') || '').trim();

    const filter: Record<string, unknown> = {};
    if (action) {
      filter.action = action;
    }

    const { db } = await connectToDatabase();
    const logs = await db
      .collection('admin_audit_logs')
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(5000)
      .toArray();

    const header = ['createdAt', 'actorEmail', 'action', 'targetType', 'targetId'];
    const rows = logs.map((log: any) => [
      log?.createdAt ? new Date(log.createdAt).toISOString() : '',
      log?.actorEmail || '',
      log?.action || '',
      log?.targetType || '',
      log?.targetId || '',
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((col) => escapeCsv(col)).join(','))
      .join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="admin-audit-logs-${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to export audit logs' },
      { status: getAdminErrorStatus(error) }
    );
  }
}
