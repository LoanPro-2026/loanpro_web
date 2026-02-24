export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { runPaymentReconciliation, retryPaymentIncidentOrder } from '@/services/paymentReconciliationService';
import { ObjectId } from 'mongodb';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'your-admin-email@gmail.com';

async function verifyAdmin() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Unauthorized');
  }

  const userResponse = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
    },
  });

  if (!userResponse.ok) {
    throw new Error('Failed to fetch user details');
  }

  const user = await userResponse.json();
  const userEmail = user.email_addresses[0]?.email_address;

  if (userEmail !== ADMIN_EMAIL) {
    throw new Error('Access denied');
  }

  return userEmail;
}

export async function GET(request: Request) {
  try {
    await verifyAdmin();

    const client = await clientPromise;
    const db = client.db('AdminDB');

    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'open';
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || '100'), 1), 300);

    const filter: any = {};
    if (status !== 'all') {
      filter.status = status;
    }

    const incidents = await db
      .collection('payment_incidents')
      .find(filter)
      .sort({
        status: 1,
        severity: -1,
        lastDetectedAt: -1,
      })
      .limit(limit)
      .toArray();

    const [openCount, criticalCount, highCount, stalePendingCount, capturedNotFinalizedCount, latestRun] = await Promise.all([
      db.collection('payment_incidents').countDocuments({ status: 'open' }),
      db.collection('payment_incidents').countDocuments({ status: 'open', severity: 'critical' }),
      db.collection('payment_incidents').countDocuments({ status: 'open', severity: 'high' }),
      db.collection('payment_incidents').countDocuments({ status: 'open', type: 'STALE_PENDING_ORDER' }),
      db.collection('payment_incidents').countDocuments({ status: 'open', type: 'CAPTURED_PAYMENT_NOT_FINALIZED' }),
      db.collection('payment_reconciliation_runs').find().sort({ createdAt: -1 }).limit(1).next(),
    ]);

    return NextResponse.json({
      success: true,
      incidents,
      summary: {
        openCount,
        criticalCount,
        highCount,
        stalePendingCount,
        capturedNotFinalizedCount,
      },
      lastRun: latestRun || null,
      config: {
        alertsEnabled: process.env.ENABLE_PAYMENT_INCIDENT_ALERTS !== 'false',
        hasAdminEmails: Boolean((process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '').trim()),
        alertCooldownMinutes: Number(process.env.PAYMENT_INCIDENT_ALERT_COOLDOWN_MINUTES || '15'),
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch payment incidents',
      },
      { status: error instanceof Error && error.message === 'Access denied' ? 403 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const adminEmail = await verifyAdmin();
    const body = await request.json();
    const action = body?.action as string;

    const client = await clientPromise;
    const db = client.db('AdminDB');

    if (action === 'run-reconciliation') {
      const result = await runPaymentReconciliation({
        source: `admin:${adminEmail}`,
        limit: Number(body?.limit || 150),
        minPendingMinutes: Number(body?.minPendingMinutes || 2),
        staleMinutes: Number(body?.staleMinutes || 30),
      });

      return NextResponse.json({ success: true, result });
    }

    if (action === 'retry-incident') {
      const orderId = String(body?.orderId || '');
      if (!orderId) {
        return NextResponse.json({ success: false, error: 'orderId is required' }, { status: 400 });
      }

      const result = await retryPaymentIncidentOrder(orderId, `admin-retry:${adminEmail}`);
      return NextResponse.json({ success: true, result });
    }

    if (action === 'update-status') {
      const incidentId = String(body?.incidentId || '');
      const status = String(body?.status || '');
      const note = String(body?.note || '').trim();

      if (!incidentId || !['open', 'resolved', 'ignored'].includes(status)) {
        return NextResponse.json({ success: false, error: 'incidentId and valid status are required' }, { status: 400 });
      }

      const now = new Date();
      await db.collection('payment_incidents').updateOne(
        { _id: new ObjectId(incidentId) },
        {
          $set: {
            status,
            updatedAt: now,
            ...(status === 'resolved'
              ? {
                  resolvedAt: now,
                  resolvedBy: adminEmail,
                  resolutionNote: note || 'Resolved by admin',
                }
              : {}),
          },
          $push: {
            history: {
              at: now,
              action: 'status_update',
              source: `admin:${adminEmail}`,
              status,
              note,
            },
          },
        } as any
      );

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process action',
      },
      { status: error instanceof Error && error.message === 'Access denied' ? 403 : 500 }
    );
  }
}
