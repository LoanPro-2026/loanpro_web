export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { runPaymentReconciliation, retryPaymentIncidentOrder } from '@/services/paymentReconciliationService';
import { ObjectId } from 'mongodb';
import { enforceAdminAccess, getAdminErrorStatus } from '@/lib/adminAuth';
import { getAdminCachedResponse, invalidateAdminCacheByTags, setAdminCachedResponse } from '@/lib/adminResponseCache';

export async function GET(request: Request) {
  try {
    await enforceAdminAccess(request, {
      permission: 'payments:read',
      rateLimitKey: 'payment-incidents:get',
      limit: 60,
      windowMs: 60_000,
    });

    const url = new URL(request.url);
    const cacheKey = `admin:payment-incidents:get:v1:${url.searchParams.toString()}`;
    const cached = getAdminCachedResponse<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const client = await clientPromise;
    const db = client.db('AdminDB');

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

    const [openCount, criticalCount, highCount, stalePendingCount, capturedNotFinalizedCount, completedNotActivatedCount, reconciliationCheckFailedCount, latestRun] = await Promise.all([
      db.collection('payment_incidents').countDocuments({ status: 'open' }),
      db.collection('payment_incidents').countDocuments({ status: 'open', severity: 'critical' }),
      db.collection('payment_incidents').countDocuments({ status: 'open', severity: 'high' }),
      db.collection('payment_incidents').countDocuments({ status: 'open', type: 'STALE_PENDING_ORDER' }),
      db.collection('payment_incidents').countDocuments({ status: 'open', type: 'CAPTURED_PAYMENT_NOT_FINALIZED' }),
      db.collection('payment_incidents').countDocuments({ status: 'open', type: 'COMPLETED_ORDER_NOT_ACTIVATED' }),
      db.collection('payment_incidents').countDocuments({ status: 'open', type: 'RECONCILIATION_CHECK_FAILED' }),
      db.collection('payment_reconciliation_runs').find().sort({ createdAt: -1 }).limit(1).next(),
    ]);

    const payload = {
      success: true,
      incidents,
      summary: {
        openCount,
        criticalCount,
        highCount,
        stalePendingCount,
        capturedNotFinalizedCount,
        completedNotActivatedCount,
        reconciliationCheckFailedCount,
      },
      lastRun: latestRun || null,
      config: {
        alertsEnabled: process.env.ENABLE_PAYMENT_INCIDENT_ALERTS !== 'false',
        hasAdminEmails: Boolean((process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '').trim()),
        alertCooldownMinutes: Number(process.env.PAYMENT_INCIDENT_ALERT_COOLDOWN_MINUTES || '15'),
      },
    };

    setAdminCachedResponse(cacheKey, payload, 12_000, ['payments', 'dashboard', 'health']);

    return NextResponse.json(payload);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch payment incidents',
      },
      { status: getAdminErrorStatus(error) }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { email: adminEmail } = await enforceAdminAccess(request, {
      permission: 'payments:write',
      rateLimitKey: 'payment-incidents:post',
      limit: 25,
      windowMs: 60_000,
    });
    const body = await request.json();
    const action = body?.action as string;

    const client = await clientPromise;
    const db = client.db('AdminDB');

    if (action === 'run-reconciliation') {
      const limit = Number(body?.limit || 150);
      const minPendingMinutes = Number(body?.minPendingMinutes || 2);
      const staleMinutes = Number(body?.staleMinutes || 30);

      if (!Number.isFinite(limit) || limit < 1 || limit > 1000) {
        return NextResponse.json({ success: false, error: 'limit must be between 1 and 1000' }, { status: 400 });
      }

      if (!Number.isFinite(minPendingMinutes) || minPendingMinutes < 1 || minPendingMinutes > 120) {
        return NextResponse.json({ success: false, error: 'minPendingMinutes must be between 1 and 120' }, { status: 400 });
      }

      if (!Number.isFinite(staleMinutes) || staleMinutes < 1 || staleMinutes > 1440) {
        return NextResponse.json({ success: false, error: 'staleMinutes must be between 1 and 1440' }, { status: 400 });
      }

      const result = await runPaymentReconciliation({
        source: `admin:${adminEmail}`,
        limit,
        minPendingMinutes,
        staleMinutes,
      });

      invalidateAdminCacheByTags(['payments', 'dashboard', 'health']);

      return NextResponse.json({ success: true, result });
    }

    if (action === 'retry-incident' || action === 'verify-and-finalize') {
      const orderId = String(body?.orderId || '');
      const localOnly = Boolean(body?.localOnly);
      const note = String(body?.note || '').trim();
      if (!orderId) {
        return NextResponse.json({ success: false, error: 'orderId is required' }, { status: 400 });
      }

      if (action === 'verify-and-finalize' && note.length < 5) {
        return NextResponse.json({ success: false, error: 'A verification note with at least 5 characters is required' }, { status: 400 });
      }

      if (note.length > 1000) {
        return NextResponse.json({ success: false, error: 'note must be 1000 characters or less' }, { status: 400 });
      }

      const recoverySource = action === 'verify-and-finalize'
        ? `admin-verify-finalize:${adminEmail}`
        : `admin-retry:${adminEmail}`;

      const result = await retryPaymentIncidentOrder(orderId, {
        source: recoverySource,
        localOnly,
        note,
      });

      const now = new Date();
      await db.collection('payment_incidents').updateMany(
        { orderId },
        {
          $set: {
            updatedAt: now,
            lastManualAction: {
              at: now,
              by: adminEmail,
              action,
              localOnly,
              note,
              result: {
                success: Boolean(result?.success),
                reason: result?.reason || null,
                paymentId: result?.paymentId || null,
                usedLocalPaymentRecord: Boolean(result?.usedLocalPaymentRecord),
              },
            },
          },
          $push: {
            history: {
              at: now,
              action: 'manual_recovery',
              source: `admin:${adminEmail}`,
              note,
              meta: {
                recoveryAction: action,
                localOnly,
                success: Boolean(result?.success),
                reason: result?.reason || null,
                usedLocalPaymentRecord: Boolean(result?.usedLocalPaymentRecord),
              },
            },
          },
        } as any
      );

      invalidateAdminCacheByTags(['payments', 'dashboard', 'health']);
      return NextResponse.json({ success: true, action, result });
    }

    if (action === 'update-status') {
      const incidentId = String(body?.incidentId || '');
      const status = String(body?.status || '');
      const note = String(body?.note || '').trim();

      if (!incidentId || !['open', 'resolved', 'ignored'].includes(status)) {
        return NextResponse.json({ success: false, error: 'incidentId and valid status are required' }, { status: 400 });
      }

      if (!ObjectId.isValid(incidentId)) {
        return NextResponse.json({ success: false, error: 'incidentId is invalid' }, { status: 400 });
      }

      if (note.length > 1000) {
        return NextResponse.json({ success: false, error: 'note must be 1000 characters or less' }, { status: 400 });
      }

      if ((status === 'resolved' || status === 'ignored') && note.length < 5) {
        return NextResponse.json({ success: false, error: 'A note with at least 5 characters is required for resolve/ignore' }, { status: 400 });
      }

      const now = new Date();
      const shouldResolve = status === 'resolved';
      const shouldIgnore = status === 'ignored';

      const updateResult = await db.collection('payment_incidents').updateOne(
        { _id: new ObjectId(incidentId) },
        {
          $set: {
            status,
            updatedAt: now,
            ...(shouldResolve
              ? {
                  resolvedAt: now,
                  resolvedBy: adminEmail,
                  resolutionNote: note || 'Resolved by admin',
                }
              : {}),
            ...(shouldIgnore
              ? {
                  ignoredAt: now,
                  ignoredBy: adminEmail,
                  resolutionNote: note || 'Ignored by admin',
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

      if (!updateResult.matchedCount) {
        return NextResponse.json({ success: false, error: 'Payment incident not found' }, { status: 404 });
      }

      invalidateAdminCacheByTags(['payments', 'dashboard', 'health']);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process action',
      },
      { status: getAdminErrorStatus(error) }
    );
  }
}
