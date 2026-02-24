import Razorpay from 'razorpay';
import clientPromise from '@/lib/mongodb';
import { logger } from '@/lib/logger';
import { POST as processPaymentSuccess } from '@/app/api/payment-success/route';
import emailService from '@/services/emailService';

type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
type IncidentStatus = 'open' | 'resolved' | 'ignored';

interface ReconciliationOptions {
  source?: string;
  limit?: number;
  minPendingMinutes?: number;
  staleMinutes?: number;
}

interface ReconciliationSummary {
  scanned: number;
  autoRecovered: number;
  completedMarked: number;
  pendingHealthy: number;
  incidentsOpened: number;
  incidentsResolved: number;
  failures: number;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  source: string;
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

async function upsertIncident(db: any, params: {
  orderId: string;
  userId?: string;
  paymentId?: string;
  type: string;
  severity: IncidentSeverity;
  message: string;
  paymentContext?: string;
  plan?: string;
  billingPeriod?: string;
  ageMinutes?: number;
  metadata?: Record<string, any>;
  source: string;
}) {
  const now = new Date();
  const incidentKey = `${params.type}:${params.orderId}`;

  const existing = await db.collection('payment_incidents').findOne({ incidentKey });
  if (existing) {
    await db.collection('payment_incidents').updateOne(
      { _id: existing._id },
      {
        $set: {
          status: existing.status === 'resolved' ? 'open' : existing.status,
          severity: params.severity,
          message: params.message,
          paymentId: params.paymentId,
          userId: params.userId,
          paymentContext: params.paymentContext,
          plan: params.plan,
          billingPeriod: params.billingPeriod,
          ageMinutes: params.ageMinutes,
          metadata: params.metadata || {},
          source: params.source,
          lastDetectedAt: now,
          updatedAt: now,
        },
        $inc: { occurrenceCount: 1 },
        $push: {
          history: {
            at: now,
            action: 'detected',
            source: params.source,
            message: params.message,
          },
        },
      }
    );
    return { created: false };
  }

  await db.collection('payment_incidents').insertOne({
    incidentKey,
    status: 'open' as IncidentStatus,
    type: params.type,
    severity: params.severity,
    message: params.message,
    orderId: params.orderId,
    paymentId: params.paymentId,
    userId: params.userId,
    paymentContext: params.paymentContext,
    plan: params.plan,
    billingPeriod: params.billingPeriod,
    ageMinutes: params.ageMinutes,
    metadata: params.metadata || {},
    source: params.source,
    occurrenceCount: 1,
    firstDetectedAt: now,
    lastDetectedAt: now,
    createdAt: now,
    updatedAt: now,
    history: [
      {
        at: now,
        action: 'detected',
        source: params.source,
        message: params.message,
      },
    ],
  });

  return { created: true };
}

async function maybeSendIncidentAlert(db: any, incidentDoc: any, source: string) {
  const isAlertEnabled = process.env.ENABLE_PAYMENT_INCIDENT_ALERTS !== 'false';
  if (!isAlertEnabled) return false;

  const severity = String(incidentDoc?.severity || '').toLowerCase();
  if (severity !== 'critical' && severity !== 'high') {
    return false;
  }

  const cooldownMinutes = Math.max(5, Number(process.env.PAYMENT_INCIDENT_ALERT_COOLDOWN_MINUTES || '15'));
  const now = Date.now();
  const lastAlertAt = incidentDoc?.lastAlertAt ? new Date(incidentDoc.lastAlertAt).getTime() : 0;
  const underCooldown = lastAlertAt > 0 && now - lastAlertAt < cooldownMinutes * 60 * 1000;

  if (underCooldown) {
    return false;
  }

  const sent = await emailService.sendPaymentIncidentAlert({
    incidentType: incidentDoc.type,
    severity: incidentDoc.severity,
    message: incidentDoc.message,
    orderId: incidentDoc.orderId,
    paymentId: incidentDoc.paymentId,
    userId: incidentDoc.userId,
    plan: incidentDoc.plan,
    billingPeriod: incidentDoc.billingPeriod,
    paymentContext: incidentDoc.paymentContext,
    ageMinutes: incidentDoc.ageMinutes,
    source,
  });

  if (sent) {
    await db.collection('payment_incidents').updateOne(
      { _id: incidentDoc._id },
      {
        $set: {
          lastAlertAt: new Date(),
          updatedAt: new Date(),
        },
        $inc: {
          alertCount: 1,
        },
        $push: {
          history: {
            at: new Date(),
            action: 'alert_sent',
            source,
            note: `Incident alert sent via email (cooldown ${cooldownMinutes}m)`,
          },
        },
      }
    );
  }

  return sent;
}

async function resolveIncidentsForOrder(db: any, orderId: string, source: string, note: string) {
  const now = new Date();
  const result = await db.collection('payment_incidents').updateMany(
    {
      orderId,
      status: { $in: ['open', 'ignored'] },
    },
    {
      $set: {
        status: 'resolved' as IncidentStatus,
        resolvedAt: now,
        updatedAt: now,
        resolutionNote: note,
        resolvedBy: source,
      },
      $push: {
        history: {
          at: now,
          action: 'resolved',
          source,
          note,
        },
      },
    }
  );

  return result.modifiedCount || 0;
}

async function finalizeOrderIntent(db: any, orderIntent: any, capturedPayment: any, source: string) {
  const userId = orderIntent.userId;
  if (!userId) {
    throw new Error('order_intent missing userId');
  }

  const user = await db.collection('users').findOne({ userId });

  const requestBody = {
    razorpay_payment_id: capturedPayment.id,
    razorpay_order_id: orderIntent.orderId,
    razorpay_signature: `${source}_verified`,
    userId,
    username: user?.email || user?.username || userId,
    plan: orderIntent.plan || 'Basic',
    billingPeriod: orderIntent.billingPeriod || 'monthly',
    isUpgrade: orderIntent.paymentContext === 'upgrade',
    isRenewal: orderIntent.paymentContext === 'renewal',
  };

  const internalRequest = new Request('http://localhost/api/payment-success', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  const response = await processPaymentSuccess(internalRequest);
  const result = await response.json();

  if (!response.ok || !result?.success) {
    throw new Error(result?.error?.message || result?.error || `payment-success failed with status ${response.status}`);
  }

  await db.collection('order_intents').updateOne(
    { _id: orderIntent._id },
    {
      $set: {
        status: 'completed',
        completedAt: new Date(),
        recoveredBy: source,
        recoveredAt: new Date(),
      },
    }
  );

  return result;
}

export async function runPaymentReconciliation(options: ReconciliationOptions = {}): Promise<ReconciliationSummary> {
  const start = Date.now();
  const source = options.source || 'system';
  const limit = Math.max(1, Math.min(options.limit || 100, 500));
  const minPendingMinutes = Math.max(1, options.minPendingMinutes || 2);
  const staleMinutes = Math.max(minPendingMinutes, options.staleMinutes || 30);

  const client = await clientPromise;
  const db = client.db('AdminDB');

  const summary: ReconciliationSummary = {
    scanned: 0,
    autoRecovered: 0,
    completedMarked: 0,
    pendingHealthy: 0,
    incidentsOpened: 0,
    incidentsResolved: 0,
    failures: 0,
    startedAt: new Date(start).toISOString(),
    completedAt: '',
    durationMs: 0,
    source,
  };

  const pendingCutoff = new Date(Date.now() - minPendingMinutes * 60 * 1000);
  const lookbackCutoff = new Date(Date.now() - 72 * 60 * 60 * 1000);

  const intents = await db
    .collection('order_intents')
    .find({
      status: 'pending',
      createdAt: { $gte: lookbackCutoff, $lte: pendingCutoff },
    })
    .sort({ createdAt: 1 })
    .limit(limit)
    .toArray();

  summary.scanned = intents.length;

  for (const orderIntent of intents) {
    const ageMinutes = Math.max(1, Math.floor((Date.now() - new Date(orderIntent.createdAt).getTime()) / 60000));

    try {
      const existingCompletedPayment = await db.collection('payments').findOne({
        orderId: orderIntent.orderId,
        status: { $in: ['captured', 'completed', 'success'] },
      });

      if (existingCompletedPayment) {
        await db.collection('order_intents').updateOne(
          { _id: orderIntent._id },
          {
            $set: {
              status: 'completed',
              completedAt: new Date(),
              finalizedBy: 'reconciliation-existing-payment',
            },
          }
        );
        summary.completedMarked += 1;
        summary.incidentsResolved += await resolveIncidentsForOrder(
          db,
          orderIntent.orderId,
          source,
          'Order marked completed because payment record already existed'
        );
        continue;
      }

      const paymentsResponse: any = await razorpay.orders.fetchPayments(orderIntent.orderId);
      const capturedPayment = (paymentsResponse?.items || []).find((payment: any) => payment.status === 'captured');

      if (capturedPayment) {
        const existingPaymentById = await db.collection('payments').findOne({
          paymentId: capturedPayment.id,
          status: { $in: ['captured', 'completed', 'success'] },
        });

        if (existingPaymentById) {
          await db.collection('order_intents').updateOne(
            { _id: orderIntent._id },
            {
              $set: {
                status: 'completed',
                completedAt: new Date(),
                finalizedBy: 'reconciliation-payment-idempotent',
              },
            }
          );
          summary.completedMarked += 1;
          summary.incidentsResolved += await resolveIncidentsForOrder(
            db,
            orderIntent.orderId,
            source,
            'Order marked completed after idempotent payment check'
          );
          continue;
        }

        try {
          await finalizeOrderIntent(db, orderIntent, capturedPayment, source);
          summary.autoRecovered += 1;
          summary.incidentsResolved += await resolveIncidentsForOrder(
            db,
            orderIntent.orderId,
            source,
            'Auto-recovered captured payment successfully'
          );
        } catch (finalizeError) {
          summary.failures += 1;
          const incident = await upsertIncident(db, {
            orderId: orderIntent.orderId,
            paymentId: capturedPayment.id,
            userId: orderIntent.userId,
            type: 'CAPTURED_PAYMENT_NOT_FINALIZED',
            severity: 'critical',
            message: 'Payment is captured in Razorpay but subscription finalization failed',
            paymentContext: orderIntent.paymentContext,
            plan: orderIntent.plan,
            billingPeriod: orderIntent.billingPeriod,
            ageMinutes,
            metadata: {
              error: finalizeError instanceof Error ? finalizeError.message : String(finalizeError),
            },
            source,
          });
          if (incident.created) summary.incidentsOpened += 1;
          const incidentDoc = await db.collection('payment_incidents').findOne({ incidentKey: `CAPTURED_PAYMENT_NOT_FINALIZED:${orderIntent.orderId}` });
          if (incidentDoc) {
            await maybeSendIncidentAlert(db, incidentDoc, source);
          }
        }

        continue;
      }

      if (ageMinutes >= staleMinutes) {
        const incident = await upsertIncident(db, {
          orderId: orderIntent.orderId,
          userId: orderIntent.userId,
          type: 'STALE_PENDING_ORDER',
          severity: ageMinutes >= staleMinutes * 3 ? 'high' : 'medium',
          message: `Order intent is pending for ${ageMinutes} minutes with no captured payment`,
          paymentContext: orderIntent.paymentContext,
          plan: orderIntent.plan,
          billingPeriod: orderIntent.billingPeriod,
          ageMinutes,
          source,
        });
        if (incident.created) summary.incidentsOpened += 1;
        const incidentDoc = await db.collection('payment_incidents').findOne({ incidentKey: `STALE_PENDING_ORDER:${orderIntent.orderId}` });
        if (incidentDoc) {
          await maybeSendIncidentAlert(db, incidentDoc, source);
        }
      } else {
        summary.pendingHealthy += 1;
      }
    } catch (error) {
      summary.failures += 1;
      const incident = await upsertIncident(db, {
        orderId: orderIntent.orderId,
        userId: orderIntent.userId,
        type: 'RECONCILIATION_CHECK_FAILED',
        severity: 'high',
        message: 'Failed while reconciling pending order intent',
        paymentContext: orderIntent.paymentContext,
        plan: orderIntent.plan,
        billingPeriod: orderIntent.billingPeriod,
        ageMinutes,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
        source,
      });
      if (incident.created) summary.incidentsOpened += 1;
      const incidentDoc = await db.collection('payment_incidents').findOne({ incidentKey: `RECONCILIATION_CHECK_FAILED:${orderIntent.orderId}` });
      if (incidentDoc) {
        await maybeSendIncidentAlert(db, incidentDoc, source);
      }
    }
  }

  summary.completedAt = new Date().toISOString();
  summary.durationMs = Date.now() - start;

  await db.collection('payment_reconciliation_runs').insertOne({
    ...summary,
    createdAt: new Date(),
  });

  logger.info('Payment reconciliation run completed', 'PAYMENT_RECONCILIATION', summary);
  return summary;
}

export async function retryPaymentIncidentOrder(orderId: string, source = 'admin-retry') {
  const client = await clientPromise;
  const db = client.db('AdminDB');

  const orderIntent = await db.collection('order_intents').findOne({ orderId });
  if (!orderIntent) {
    throw new Error('Order intent not found');
  }

  if (orderIntent.status === 'completed') {
    await resolveIncidentsForOrder(db, orderId, source, 'Order already completed');
    return { success: true, alreadyCompleted: true };
  }

  const paymentsResponse: any = await razorpay.orders.fetchPayments(orderId);
  const capturedPayment = (paymentsResponse?.items || []).find((payment: any) => payment.status === 'captured');

  if (!capturedPayment) {
    await upsertIncident(db, {
      orderId,
      userId: orderIntent.userId,
      type: 'STALE_PENDING_ORDER',
      severity: 'medium',
      message: 'Manual retry found no captured payment for this order',
      paymentContext: orderIntent.paymentContext,
      plan: orderIntent.plan,
      billingPeriod: orderIntent.billingPeriod,
      source,
    });
    return { success: false, reason: 'no_captured_payment' };
  }

  await finalizeOrderIntent(db, orderIntent, capturedPayment, source);
  await resolveIncidentsForOrder(db, orderId, source, 'Manual retry recovered payment successfully');

  return {
    success: true,
    paymentId: capturedPayment.id,
    orderId,
  };
}
