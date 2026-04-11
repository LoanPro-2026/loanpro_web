import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { successResponse, errorResponse, ApiErrors } from '@/lib/apiResponse';
import { validateOrderRequest } from '@/lib/validation';
import { RateLimitPresets } from '@/lib/rateLimit';
import { getRazorpayClient } from '@/lib/razorpayClient';
import { getEffectivePlanPricing, normalizePlanName } from '@/lib/planConfig';
import { connectToDatabase } from '@/lib/mongodb';
import { getCouponQuote } from '@/lib/couponUtils';
import { calculatePlanAmountPaise, calculatePlanAmountRupees, type PaidPlanName } from '@/lib/pricing';
import { logger } from '@/lib/logger';
import { enforceRequestRateLimit, parseJsonRequest, toSafeErrorResponse, withRecovery } from '@/lib/apiSafety';

async function resolveUserIdFromRequest(req: Request): Promise<string | null> {
  const { userId } = await auth();
  if (userId) return userId;

  const desktopAccessToken = req.headers.get('x-desktop-access-token')?.trim();
  if (!desktopAccessToken) return null;

  const { db } = await connectToDatabase();
  const user = await db.collection('users').findOne({ accessToken: desktopAccessToken }, { projection: { userId: 1 } });
  return typeof user?.userId === 'string' ? user.userId : null;
}

export async function POST(req: Request) {
  logger.info('Create order API route called', 'CREATE_ORDER');
  
  try {
    const { client: razorpay, error: razorpayInitError, keyId } = getRazorpayClient();

    // Check if Razorpay is initialized
    if (!razorpay) {
      logger.error('Razorpay not initialized', razorpayInitError || new Error('PAYMENT_CONFIG_ERROR'), 'CREATE_ORDER');
      return errorResponse({
        code: 'PAYMENT_CONFIG_ERROR',
        message: razorpayInitError || 'Payment system is not configured',
        statusCode: 500,
      });
    }

    logger.info('Razorpay initialized', 'CREATE_ORDER', { keyType: keyId.includes('test') ? 'test' : 'live' });

    // Check authentication
    const userId = await resolveUserIdFromRequest(req);
    logger.debug('Create order authenticated request', 'CREATE_ORDER', { userId: userId || null });
    
    if (!userId) {
      logger.warn('Unauthorized create order attempt', 'CREATE_ORDER');
      return errorResponse(ApiErrors.UNAUTHORIZED);
    }

    // Rate limiting - prevent abuse
    const rateLimitResponse = enforceRequestRateLimit({
      request: req,
      scope: 'create-order',
      limit: RateLimitPresets.PAYMENT.limit,
      windowMs: RateLimitPresets.PAYMENT.windowMs,
      userId,
    });
    if (rateLimitResponse) return rateLimitResponse;

    // Parse and validate request body
    const parsedBody = await parseJsonRequest<Record<string, any>>(req, { maxBytes: 64 * 1024 });
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.data;

    // Validate input
    const validation = validateOrderRequest(body);
    if (!validation.isValid()) {
      const error = validation.getFirstError();
      return errorResponse({
        code: 'VALIDATION_ERROR',
        message: error?.message || 'Validation failed',
        statusCode: 400,
        details: validation.errors,
      });
    }

    const { plan, billingPeriod = 'monthly', amount, paymentContext = 'new' } = body;
    const normalizedPlan = normalizePlanName(plan);
    const normalizedCouponCode = String(body?.couponCode || '').trim().toUpperCase();

    if (normalizedPlan === 'trial') {
      return errorResponse({
        code: 'INVALID_PLAN',
        message: 'Trial does not require payment order creation.',
        statusCode: 400,
      });
    }

    const allowedContexts = ['new', 'renewal', 'upgrade'];
    const normalizedPaymentContext = allowedContexts.includes(paymentContext) ? paymentContext : 'new';

    // IDEMPOTENCY: Check for existing pending order (prevent duplicate orders)
    const { db } = await connectToDatabase();
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existingOrder = await db.collection('order_intents').findOne({
      userId,
      plan: normalizedPlan,
      billingPeriod,
      paymentContext: normalizedPaymentContext,
      couponCode: normalizedCouponCode || null,
      status: 'pending',
      createdAt: { $gt: fiveMinutesAgo }
    });

    if (existingOrder) {
      logger.info('Reusing existing create-order intent', 'CREATE_ORDER', { orderId: existingOrder.orderId, userId });
      return successResponse({
        orderId: existingOrder.orderId,
        amount: existingOrder.amount,
        currency: 'INR',
        plan: normalizedPlan,
        billingPeriod,
        reused: true,
        breakdown: {
          basePrice: Math.round(Number(existingOrder.baseAmount || existingOrder.amount || 0) / 100),
          discountAmount: Math.round(Number(existingOrder.discountAmount || 0) / 100),
          total: Math.round(Number(existingOrder.amount || 0) / 100),
          currency: 'INR',
        },
        coupon: existingOrder.coupon || null,
      }, 'Existing order found', 200);
    }

    const pricing = await getEffectivePlanPricing(db);

    const monthlyPriceRupees = Number((pricing as Record<PaidPlanName, number>)[normalizedPlan as PaidPlanName] || 0);
    if (!monthlyPriceRupees) {
      return errorResponse({
        code: 'INVALID_PLAN',
        message: `Plan '${normalizedPlan}' is not available`,
        statusCode: 400,
      });
    }

    const subtotalRupees = calculatePlanAmountRupees(monthlyPriceRupees, billingPeriod as 'monthly' | 'annually');
    const subtotalPaise = calculatePlanAmountPaise(monthlyPriceRupees, billingPeriod as 'monthly' | 'annually');
    const couponQuote = await getCouponQuote(db, {
      couponCode: normalizedCouponCode,
      plan: normalizedPlan,
      billingPeriod: billingPeriod as 'monthly' | 'annually',
      subtotal: subtotalRupees,
    });

    if (normalizedCouponCode && !couponQuote.applied) {
      return errorResponse({
        code: 'INVALID_COUPON',
        message: couponQuote.message || 'Coupon could not be applied.',
        statusCode: 400,
        details: { reason: couponQuote.reason, couponCode: normalizedCouponCode },
      });
    }

    const orderAmount = couponQuote.totalAmount * 100;

    // If frontend sent an amount, validate it matches (within 1% tolerance for rounding)
    if (amount && Math.abs(amount - orderAmount) > Math.max(100, orderAmount * 0.01)) {
      return errorResponse({
        code: 'AMOUNT_MISMATCH',
        message: 'Price mismatch detected. Please refresh and try again.',
        statusCode: 400,
      });
    }

    // Validate amount is reasonable (₹1 to ₹150,000)
    // Note: Razorpay test mode has a limit of ₹10,000 per transaction
    const minAmount = 100; // ₹1
    const maxAmount = 15000000; // ₹150,000 (production limit)
    const testModeMaxAmount = 1000000; // ₹10,000 (test mode limit)
    
    if (orderAmount < minAmount || orderAmount > maxAmount) {
      return errorResponse({
        code: 'INVALID_AMOUNT',
        message: `Order amount must be between ₹${minAmount/100} and ₹${maxAmount/100}`,
        statusCode: 400,
      });
    }

    // Warn if exceeding test mode limit (but allow it for production)
    if (orderAmount > testModeMaxAmount && process.env.NODE_ENV !== 'production') {
      logger.warn('Create order amount exceeds Razorpay test mode limit', 'CREATE_ORDER', { amount: orderAmount / 100 });
    }

    logger.info('Processing create order request', 'CREATE_ORDER', { 
      userId,
      plan: normalizedPlan,
      billingPeriod, 
      monthlyPriceRupees,
      subtotalRupees,
      couponCode: normalizedCouponCode || null,
      discountAmount: couponQuote.discountAmount,
      orderAmount 
    });

    // Create Razorpay order with short receipt ID (max 40 chars)
    // Format: rcpt_<timestamp>_<first 8 chars of userId>
    const timestamp = Date.now().toString().slice(-10); // Last 10 digits
    const userIdShort = userId.slice(-8); // Last 8 chars of userId
    const receiptId = `rcpt_${timestamp}_${userIdShort}`; // Max 28 chars
    
    logger.debug('Create order receipt generated', 'CREATE_ORDER', { receiptId, length: receiptId.length });

    // Create Razorpay order
    let order;
    try {
      logger.info('Creating Razorpay order', 'CREATE_ORDER', { userId, plan: normalizedPlan });
      order = await withRecovery(
        () =>
          razorpay.orders.create({
            amount: orderAmount,
            currency: 'INR',
            receipt: receiptId,
            notes: {
              userId,
              plan: normalizedPlan,
              billingPeriod,
              paymentContext: normalizedPaymentContext,
              couponCode: normalizedCouponCode || '',
            },
          }),
        {
          operation: 'razorpay-order-create',
          context: 'CREATE_ORDER',
          attempts: 2,
          baseDelayMs: 300,
        }
      );
      logger.info('Razorpay order created', 'CREATE_ORDER', { orderId: order.id });
    } catch (rzpError: any) {
      logger.error('Razorpay order creation failed', rzpError, 'CREATE_ORDER');
      throw rzpError; // Re-throw to be caught by outer catch
    }

    logger.info('Create order completed successfully', 'CREATE_ORDER', { orderId: order.id });

    // Store order intent for idempotency and abandoned cart tracking
    const now = new Date();
    await db.collection('order_intents').updateOne(
      { orderId: order.id },
      {
        $set: {
          userId,
          plan: normalizedPlan,
          billingPeriod,
          paymentContext: normalizedPaymentContext,
          couponCode: normalizedCouponCode || null,
          coupon: couponQuote.coupon,
          baseAmount: subtotalPaise,
          discountAmount: couponQuote.discountAmount * 100,
          amount: orderAmount,
          status: 'pending',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          reminderSent: false,
          updatedAt: now,
        },
        $setOnInsert: {
          orderId: order.id,
          createdAt: now,
        },
      },
      { upsert: true }
    );

    return successResponse({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      plan: normalizedPlan,
      billingPeriod,
      breakdown: {
        basePrice: subtotalPaise / 100,
        discountAmount: couponQuote.discountAmount,
        total: orderAmount / 100,
        currency: 'INR'
      },
      coupon: couponQuote.coupon,
    }, 'Order created successfully', 201);

  } catch (error: any) {
    logger.error('Create order failed', error, 'CREATE_ORDER');

    // Handle Razorpay API errors
    if (error?.error?.code) {
      const razorpayError = error.error;
      const statusCode = error?.statusCode || razorpayError?.statusCode;
      const description = String(razorpayError?.description || '').trim();

      if (statusCode === 401 || description === 'Authentication failed') {
        return errorResponse({
          code: 'RAZORPAY_AUTH_FAILED',
          message: 'Razorpay authentication failed. Verify RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are a valid matching pair from the same account and mode (test/live).',
          statusCode: 502,
        });
      }

      logger.error('Razorpay API error during create order', razorpayError, 'CREATE_ORDER');
      return errorResponse({
        code: razorpayError.code || 'PAYMENT_ERROR',
        message: description || 'Failed to create payment order. Verify Razorpay key/secret pair and account mode.',
        statusCode: statusCode || 500,
      });
    }

    // Handle standard errors
    if (error instanceof Error) {
      return errorResponse({
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to process order',
        statusCode: 500,
      });
    }

    // Fallback error
    return toSafeErrorResponse(error, 'CREATE_ORDER', 'Failed to process order');
  }
}