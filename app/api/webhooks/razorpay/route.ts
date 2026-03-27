export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import clientPromise from '@/lib/mongodb';
import { POST as processPaymentSuccess } from '@/app/api/payment-success/route';
import { logger } from '@/lib/logger';

const SUCCESSFUL_PAYMENT_STATUS_REGEX = /^(captured|completed|success|successful|paid)$/i;
const INTERNAL_PAYMENT_SUCCESS_URL = 'https://loanpro.tech/api/payment-success';

function normalizePlanName(plan: string | undefined): 'Basic' | 'Pro' | 'Enterprise' {
  const normalized = (plan || 'Basic').toLowerCase();
  if (normalized === 'pro') return 'Pro';
  if (normalized === 'enterprise') return 'Enterprise';
  return 'Basic';
}

function safeCompareSignature(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual || '', 'utf8');
  const expectedBuffer = Buffer.from(expected || '', 'utf8');

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function normalizeBillingPeriod(input: string | undefined): 'monthly' | 'annually' {
  return input === 'annually' ? 'annually' : 'monthly';
}

function normalizePaymentContext(input: string | undefined): 'new' | 'upgrade' | 'renewal' {
  if (input === 'upgrade') return 'upgrade';
  if (input === 'renewal') return 'renewal';
  return 'new';
}

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error('Razorpay webhook secret missing', new Error('Missing RAZORPAY_WEBHOOK_SECRET'), 'RAZORPAY_WEBHOOK');
      return NextResponse.json({ success: false, error: 'Webhook not configured' }, { status: 500 });
    }

    const signature = req.headers.get('x-razorpay-signature');
    if (!signature) {
      logger.warn('Missing Razorpay signature header', 'RAZORPAY_WEBHOOK');
      return NextResponse.json({ success: false, error: 'Missing signature' }, { status: 400 });
    }

    const rawBody = await req.text();

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (!safeCompareSignature(signature, expectedSignature)) {
      logger.warn('Invalid Razorpay webhook signature', 'RAZORPAY_WEBHOOK');
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload?.event as string | undefined;

    logger.info('Razorpay webhook received', 'RAZORPAY_WEBHOOK', {
      event,
      accountId: payload?.account_id,
    });

    if (event !== 'payment.captured' && event !== 'order.paid') {
      return NextResponse.json({ success: true, ignored: true, event }, { status: 200 });
    }

    const paymentEntity = payload?.payload?.payment?.entity || payload?.payload?.payment;
    const orderEntity = payload?.payload?.order?.entity || payload?.payload?.order;

    const razorpayPaymentId = paymentEntity?.id as string | undefined;
    const razorpayOrderId = (paymentEntity?.order_id || orderEntity?.id) as string | undefined;

    if (!razorpayPaymentId || !razorpayOrderId) {
      logger.warn('Webhook missing payment/order identifiers', 'RAZORPAY_WEBHOOK', {
        event,
      });
      return NextResponse.json({ success: false, error: 'Invalid webhook payload' }, { status: 400 });
    }

    if (paymentEntity?.status && paymentEntity.status !== 'captured') {
      return NextResponse.json({ success: true, ignored: true, reason: `payment status ${paymentEntity.status}` }, { status: 200 });
    }

    const db = (await clientPromise).db('AdminDB');

    const existingPayment = await db.collection('payments').findOne({
      paymentId: razorpayPaymentId,
      $or: [
        { status: { $in: ['captured', 'processing', 'completed', 'success', 'successful', 'paid'] } },
        { status: { $regex: SUCCESSFUL_PAYMENT_STATUS_REGEX } },
      ],
    });

    if (existingPayment) {
      await db.collection('order_intents').updateOne(
        { orderId: razorpayOrderId },
        {
          $set: {
            status: 'completed',
            completedAt: new Date(),
            finalizedBy: 'razorpay-webhook-idempotent',
          },
        }
      );

      return NextResponse.json({ success: true, alreadyProcessed: true }, { status: 200 });
    }

    let orderIntent = await db.collection('order_intents').findOne({ orderId: razorpayOrderId });
    const webhookNotes = paymentEntity?.notes || orderEntity?.notes || {};

    if (!orderIntent) {
      const syntheticUserId = String(webhookNotes?.userId || '').trim();
      if (!syntheticUserId) {
        logger.warn('No order intent found and webhook notes missing userId', 'RAZORPAY_WEBHOOK', {
          orderId: razorpayOrderId,
          paymentId: razorpayPaymentId,
        });
        return NextResponse.json({ success: false, error: 'Unable to determine user for order' }, { status: 400 });
      }

      const now = new Date();
      const syntheticPlan = normalizePlanName(webhookNotes?.plan as string | undefined);
      const syntheticBillingPeriod = normalizeBillingPeriod(webhookNotes?.billingPeriod as string | undefined);
      const syntheticPaymentContext = normalizePaymentContext((webhookNotes?.paymentContext || webhookNotes?.type) as string | undefined);
      const syntheticAmount = Number(orderEntity?.amount || paymentEntity?.amount || 0);
      const syntheticCouponCode = typeof webhookNotes?.couponCode === 'string' && webhookNotes.couponCode.trim().length > 0
        ? webhookNotes.couponCode.trim().toUpperCase()
        : null;

      await db.collection('order_intents').updateOne(
        { orderId: razorpayOrderId },
        {
          $set: {
            userId: syntheticUserId,
            plan: syntheticPlan,
            billingPeriod: syntheticBillingPeriod,
            paymentContext: syntheticPaymentContext,
            couponCode: syntheticCouponCode,
            coupon: null,
            baseAmount: syntheticAmount,
            discountAmount: 0,
            amount: syntheticAmount,
            status: 'pending',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            reminderSent: false,
            updatedAt: now,
            recoveredBy: 'razorpay-webhook-synthetic-intent',
          },
          $setOnInsert: {
            orderId: razorpayOrderId,
            createdAt: now,
          },
        },
        { upsert: true }
      );

      orderIntent = await db.collection('order_intents').findOne({ orderId: razorpayOrderId });
    }

    const userId = (orderIntent?.userId || webhookNotes?.userId) as string | undefined;
    if (!userId) {
      logger.warn('No userId found for webhook order', 'RAZORPAY_WEBHOOK', {
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
      });
      return NextResponse.json({ success: false, error: 'Unable to determine user for order' }, { status: 400 });
    }

    const user = await db.collection('users').findOne({ userId });

    const plan = normalizePlanName((orderIntent?.plan || webhookNotes?.plan) as string | undefined);
    const billingPeriod = normalizeBillingPeriod((orderIntent?.billingPeriod || webhookNotes?.billingPeriod) as string | undefined);
    const paymentContext = normalizePaymentContext((orderIntent?.paymentContext || webhookNotes?.paymentContext || webhookNotes?.type) as string | undefined);

    const requestBody = {
      razorpay_payment_id: razorpayPaymentId,
      razorpay_order_id: razorpayOrderId,
      razorpay_signature: 'webhook_verified',
      userId,
      username: user?.email || user?.username || userId,
      plan,
      billingPeriod,
      isUpgrade: paymentContext === 'upgrade',
      isRenewal: paymentContext === 'renewal',
    };

    const internalRequest = new Request(INTERNAL_PAYMENT_SUCCESS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const paymentSuccessResponse = await processPaymentSuccess(internalRequest);
    const paymentSuccessData = await paymentSuccessResponse.json();

    if (!paymentSuccessResponse.ok || !paymentSuccessData?.success) {
      logger.error('Webhook finalization failed', new Error('payment-success failed'), 'RAZORPAY_WEBHOOK', {
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        status: paymentSuccessResponse.status,
        response: paymentSuccessData,
      });

      return NextResponse.json(
        { success: false, error: 'Failed to finalize payment, will retry' },
        { status: 500 }
      );
    }

    await db.collection('order_intents').updateOne(
      { orderId: razorpayOrderId },
      {
        $set: {
          status: 'completed',
          completedAt: new Date(),
          finalizedBy: 'razorpay-webhook',
        },
      }
    );

    logger.info('Webhook payment finalized successfully', 'RAZORPAY_WEBHOOK', {
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      userId,
      duration: Date.now() - startTime,
    });

    return NextResponse.json({ success: true, processed: true }, { status: 200 });
  } catch (error) {
    logger.error('Razorpay webhook processing error', error as Error, 'RAZORPAY_WEBHOOK');
    return NextResponse.json({ success: false, error: 'Webhook processing failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Razorpay webhook endpoint. Only POST requests are supported.' },
    { status: 405 }
  );
}
