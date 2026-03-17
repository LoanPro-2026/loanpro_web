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
  completedScanned: number;
  autoRecovered: number;
  completedMarked: number;
  pendingHealthy: number;
  incidentsOpened: number;
  incidentsResolved: number;
  completedWithoutActivation: number;
  failures: number;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  source: string;
}

const SUCCESS_STATUS_REGEX = /^(captured|completed|success|successful|paid)$/i;

function isSuccessfulStatus(status: unknown): boolean {
  return SUCCESS_STATUS_REGEX.test(String(status || '').trim());
}

function findCapturedLikePayment(items: any[]): any | undefined {
  return items.find((payment: any) => isSuccessfulStatus(payment?.status));
}

function buildSuccessfulPaymentMatch(fieldName: string) {
  return {
    $or: [
      { [fieldName]: { $in: ['captured', 'completed', 'success', 'successful', 'paid'] } },
      { [fieldName]: { $regex: SUCCESS_STATUS_REGEX } },
    ],
  };
}

async function hasActivePaidSubscription(db: any, userId: string): Promise<boolean> {
  if (!userId) return false;
  const active = await db.collection('subscriptions').findOne({
    userId,
    status: { $in: ['active', 'active_subscription'] },
    plan: { $ne: 'trial' },
  });
  return Boolean(active);
}

async function ensureRecoverableOrderIntent(db: any, orderIntent: any, capturedPayment: any, source: string) {
  const now = new Date();
  const paymentAmount = Number(capturedPayment?.amount || orderIntent?.amount || 0);
  const couponCode = typeof orderIntent?.couponCode === 'string' && orderIntent.couponCode.trim().length > 0
    ? orderIntent.couponCode.trim().toUpperCase()
    : null;

  await db.collection('order_intents').updateOne(
    { orderId: orderIntent.orderId },
    {
      $set: {
        userId: orderIntent.userId,
        plan: orderIntent.plan || 'Basic',
        billingPeriod: orderIntent.billingPeriod || 'monthly',
        paymentContext: orderIntent.paymentContext || 'new',
        couponCode,
        coupon: orderIntent.coupon || null,
        baseAmount: Number(orderIntent?.baseAmount || paymentAmount),
        discountAmount: Number(orderIntent?.discountAmount || 0),
        amount: Number(orderIntent?.amount || paymentAmount),
        status: orderIntent.status === 'completed' ? 'completed' : 'pending',
        expiresAt: orderIntent.expiresAt ? new Date(orderIntent.expiresAt) : new Date(Date.now() + 24 * 60 * 60 * 1000),
        reminderSent: Boolean(orderIntent?.reminderSent),
        updatedAt: now,
        recoveredBy: source,
      },
      $setOnInsert: {
        orderId: orderIntent.orderId,
        createdAt: orderIntent.createdAt ? new Date(orderIntent.createdAt) : now,
      },
    },
    { upsert: true }
  );
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

async function resolveIncidentsForOrder(db: any, orderId: string, source: string, note: string, actionMeta?: Record<string, any>) {
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
          ...(actionMeta ? { meta: actionMeta } : {}),
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

  const paymentId = String(capturedPayment?.id || capturedPayment?.paymentId || capturedPayment?.razorpay_payment_id || '').trim();
  if (!paymentId) {
    throw new Error('Captured payment id is missing');
  }

  await ensureRecoverableOrderIntent(db, orderIntent, capturedPayment, source);

  const user = await db.collection('users').findOne({ userId });

  const requestBody = {
    razorpay_payment_id: paymentId,
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

  const orderIntentFilter = orderIntent?._id
    ? { _id: orderIntent._id }
    : { orderId: orderIntent.orderId };

  await db.collection('order_intents').updateOne(orderIntentFilter, {
    $set: {
      status: 'completed',
      completedAt: new Date(),
      recoveredBy: source,
      recoveredAt: new Date(),
    },
  });

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
    completedScanned: 0,
    autoRecovered: 0,
    completedMarked: 0,
    pendingHealthy: 0,
    incidentsOpened: 0,
    incidentsResolved: 0,
    completedWithoutActivation: 0,
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
        ...buildSuccessfulPaymentMatch('status'),
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
      const capturedPayment = findCapturedLikePayment(paymentsResponse?.items || []);

      if (capturedPayment) {
        const existingPaymentById = await db.collection('payments').findOne({
          paymentId: capturedPayment.id,
          ...buildSuccessfulPaymentMatch('status'),
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

  const completedIntents = await db
    .collection('order_intents')
    .find({
      status: 'completed',
      completedAt: { $gte: lookbackCutoff },
    })
    .sort({ completedAt: -1 })
    .limit(limit)
    .toArray();

  summary.completedScanned = completedIntents.length;

  for (const completedIntent of completedIntents) {
    const userId = String(completedIntent.userId || '');
    const orderId = String(completedIntent.orderId || '');
    if (!userId || !orderId) {
      continue;
    }

    try {
      const [hasActiveSubscription, successfulPayment] = await Promise.all([
        hasActivePaidSubscription(db, userId),
        db.collection('payments').findOne({
          orderId,
          ...buildSuccessfulPaymentMatch('status'),
        }),
      ]);

      if (hasActiveSubscription) {
        summary.incidentsResolved += await resolveIncidentsForOrder(
          db,
          orderId,
          source,
          'Recovered: active subscription is present for completed order'
        );
        continue;
      }

      summary.completedWithoutActivation += 1;

      if (!successfulPayment) {
        const paymentsResponse: any = await razorpay.orders.fetchPayments(orderId);
        const capturedPayment = findCapturedLikePayment(paymentsResponse?.items || []);

        if (capturedPayment) {
          try {
            await finalizeOrderIntent(db, completedIntent, capturedPayment, source);
            summary.autoRecovered += 1;
            summary.incidentsResolved += await resolveIncidentsForOrder(
              db,
              orderId,
              source,
              'Auto-recovered completed order with captured payment and missing activation'
            );
            continue;
          } catch (finalizeError) {
            summary.failures += 1;
            const incident = await upsertIncident(db, {
              orderId,
              paymentId: capturedPayment.id,
              userId,
              type: 'COMPLETED_ORDER_NOT_ACTIVATED',
              severity: 'critical',
              message: 'Order is completed and payment is captured, but subscription is not active',
              paymentContext: completedIntent.paymentContext,
              plan: completedIntent.plan,
              billingPeriod: completedIntent.billingPeriod,
              metadata: {
                error: finalizeError instanceof Error ? finalizeError.message : String(finalizeError),
              },
              source,
            });
            if (incident.created) summary.incidentsOpened += 1;
            const incidentDoc = await db.collection('payment_incidents').findOne({ incidentKey: `COMPLETED_ORDER_NOT_ACTIVATED:${orderId}` });
            if (incidentDoc) {
              await maybeSendIncidentAlert(db, incidentDoc, source);
            }
            continue;
          }
        }
      }

      const incident = await upsertIncident(db, {
        orderId,
        userId,
        paymentId: successfulPayment?.paymentId,
        type: 'COMPLETED_ORDER_NOT_ACTIVATED',
        severity: 'critical',
        message: 'Order is marked completed but user does not have an active paid subscription',
        paymentContext: completedIntent.paymentContext,
        plan: completedIntent.plan,
        billingPeriod: completedIntent.billingPeriod,
        source,
      });
      if (incident.created) summary.incidentsOpened += 1;
      const incidentDoc = await db.collection('payment_incidents').findOne({ incidentKey: `COMPLETED_ORDER_NOT_ACTIVATED:${orderId}` });
      if (incidentDoc) {
        await maybeSendIncidentAlert(db, incidentDoc, source);
      }
    } catch (error) {
      summary.failures += 1;
      const incident = await upsertIncident(db, {
        orderId,
        userId,
        type: 'RECONCILIATION_CHECK_FAILED',
        severity: 'high',
        message: 'Failed while checking completed order activation state',
        paymentContext: completedIntent.paymentContext,
        plan: completedIntent.plan,
        billingPeriod: completedIntent.billingPeriod,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          phase: 'completed-order-verification',
        },
        source,
      });
      if (incident.created) summary.incidentsOpened += 1;
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

interface RetryPaymentIncidentOptions {
  source?: string;
  localOnly?: boolean;
  note?: string;
}

export async function retryPaymentIncidentOrder(orderId: string, options: RetryPaymentIncidentOptions | string = 'admin-retry') {
  const normalizedOptions: RetryPaymentIncidentOptions = typeof options === 'string'
    ? { source: options }
    : (options || {});
  const source = String(normalizedOptions.source || 'admin-retry');
  const localOnly = Boolean(normalizedOptions.localOnly);
  const note = String(normalizedOptions.note || '').trim();

  const client = await clientPromise;
  const db = client.db('AdminDB');

  const [orderIntent, latestIncident, successfulPaymentRecord] = await Promise.all([
    db.collection('order_intents').findOne({ orderId }),
    db.collection('payment_incidents').find({ orderId }).sort({ lastDetectedAt: -1 }).limit(1).next(),
    db.collection('payments').findOne({
      orderId,
      ...buildSuccessfulPaymentMatch('status'),
    }),
  ]);

  if (!orderIntent && !successfulPaymentRecord) {
    throw new Error('Order intent and successful payment record were not found');
  }

  if (!orderIntent && successfulPaymentRecord) {
    const userId = String(successfulPaymentRecord.userId || latestIncident?.userId || '').trim();
    if (!userId) {
      throw new Error('Cannot recover order: userId is missing in both order intent and payment record');
    }

    const syntheticOrderIntent = {
      orderId,
      userId,
      plan: latestIncident?.plan || successfulPaymentRecord.plan || 'Basic',
      billingPeriod: latestIncident?.billingPeriod || successfulPaymentRecord.billingPeriod || 'monthly',
      paymentContext: latestIncident?.paymentContext || successfulPaymentRecord.paymentContext || 'purchase',
    };

    const syntheticPayment = {
      id: successfulPaymentRecord.paymentId || successfulPaymentRecord.razorpay_payment_id || `manual_${orderId}`,
    };

    await finalizeOrderIntent(db, syntheticOrderIntent, syntheticPayment, source);
    await resolveIncidentsForOrder(db, orderId, source, 'Recovered using successful local payment record', {
      mode: localOnly ? 'local-only' : 'standard',
      note,
      usedLocalPaymentRecord: true,
      syntheticOrderIntent: true,
    });

    return {
      success: true,
      orderId,
      paymentId: syntheticPayment.id,
      activationHealthy: true,
      usedLocalPaymentRecord: true,
    };
  }

  const userId = String(orderIntent?.userId || '');
  const activePaidSubscription = userId ? await hasActivePaidSubscription(db, userId) : false;

  if (orderIntent?.status === 'completed' && activePaidSubscription) {
    await resolveIncidentsForOrder(db, orderId, source, 'Order already completed with active subscription', {
      mode: localOnly ? 'local-only' : 'standard',
      note,
    });
    return { success: true, alreadyCompleted: true, activationHealthy: true };
  }

  if (successfulPaymentRecord && orderIntent) {
    const recoveredPaymentId = String(
      successfulPaymentRecord.paymentId || successfulPaymentRecord.razorpay_payment_id || `local_${orderId}`
    );

    await finalizeOrderIntent(
      db,
      orderIntent,
      { id: recoveredPaymentId },
      `${source}:local-payment`
    );
    await resolveIncidentsForOrder(db, orderId, source, 'Recovered using existing successful payment record', {
      mode: localOnly ? 'local-only' : 'standard',
      note,
      usedLocalPaymentRecord: true,
    });

    return {
      success: true,
      orderId,
      paymentId: recoveredPaymentId,
      activationHealthy: true,
      usedLocalPaymentRecord: true,
    };
  }

  if (localOnly) {
    await upsertIncident(db, {
      orderId,
      userId: orderIntent?.userId,
      type: 'STALE_PENDING_ORDER',
      severity: 'medium',
      message: 'Local-only verification found no successful local payment record for this order',
      paymentContext: orderIntent?.paymentContext,
      plan: orderIntent?.plan,
      billingPeriod: orderIntent?.billingPeriod,
      source,
      metadata: {
        localOnly: true,
        note,
      },
    });

    return {
      success: false,
      reason: 'no_local_successful_payment',
      activationHealthy: activePaidSubscription,
      localOnly: true,
    };
  }

  const paymentsResponse: any = await razorpay.orders.fetchPayments(orderId);
  const capturedPayment = findCapturedLikePayment(paymentsResponse?.items || []);

  if (!capturedPayment) {
    await upsertIncident(db, {
      orderId,
      userId: orderIntent?.userId,
      type: 'STALE_PENDING_ORDER',
      severity: 'medium',
      message: 'Manual retry found no captured payment for this order',
      paymentContext: orderIntent?.paymentContext,
      plan: orderIntent?.plan,
      billingPeriod: orderIntent?.billingPeriod,
      source,
    });
    return { success: false, reason: 'no_captured_payment', activationHealthy: activePaidSubscription };
  }

  await finalizeOrderIntent(db, orderIntent, capturedPayment, source);
  await resolveIncidentsForOrder(db, orderId, source, 'Manual retry recovered payment successfully', {
    mode: 'standard',
    note,
  });

  return {
    success: true,
    paymentId: capturedPayment.id,
    orderId,
    activationHealthy: true,
  };
}
