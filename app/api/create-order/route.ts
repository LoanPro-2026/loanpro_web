import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { successResponse, errorResponse, ApiErrors } from '@/lib/apiResponse';
import { validateOrderRequest } from '@/lib/validation';
import { checkRateLimit, RateLimitPresets } from '@/lib/rateLimit';
import { getRazorpayClient } from '@/lib/razorpayClient';
import { getEffectivePlanPricing } from '@/lib/planConfig';
import { connectToDatabase } from '@/lib/mongodb';

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
  console.log('[CREATE-ORDER] API route called');
  
  try {
    const { client: razorpay, error: razorpayInitError, keyId } = getRazorpayClient();

    // Check if Razorpay is initialized
    if (!razorpay) {
      console.error('[CREATE-ORDER] Razorpay not initialized');
      return errorResponse({
        code: 'PAYMENT_CONFIG_ERROR',
        message: razorpayInitError || 'Payment system is not configured',
        statusCode: 500,
      });
    }

    console.log('[CREATE-ORDER] Razorpay initialized', { keyType: keyId.includes('test') ? 'test' : 'live' });

    // Check authentication
    const userId = await resolveUserIdFromRequest(req);
    console.log('[CREATE-ORDER] User ID:', userId);
    
    if (!userId) {
      console.log('[CREATE-ORDER] Unauthorized - no user ID');
      return errorResponse(ApiErrors.UNAUTHORIZED);
    }

    // Rate limiting - prevent abuse
    const rateLimitKey = `create-order:${userId}`;
    if (!checkRateLimit(rateLimitKey, RateLimitPresets.PAYMENT.limit, RateLimitPresets.PAYMENT.windowMs)) {
      return errorResponse(ApiErrors.RATE_LIMIT);
    }

    // Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch {
      return errorResponse({
        code: 'INVALID_JSON',
        message: 'Invalid JSON in request body',
        statusCode: 400,
      });
    }

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

    const allowedContexts = ['new', 'renewal', 'upgrade'];
    const normalizedPaymentContext = allowedContexts.includes(paymentContext) ? paymentContext : 'new';

    // IDEMPOTENCY: Check for existing pending order (prevent duplicate orders)
    const { db } = await connectToDatabase();
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existingOrder = await db.collection('order_intents').findOne({
      userId,
      plan,
      billingPeriod,
      paymentContext: normalizedPaymentContext,
      status: 'pending',
      createdAt: { $gt: fiveMinutesAgo }
    });

    if (existingOrder) {
      console.log('[CREATE-ORDER] Reusing existing order:', existingOrder.orderId);
      return successResponse({
        orderId: existingOrder.orderId,
        amount: existingOrder.amount,
        currency: 'INR',
        plan,
        billingPeriod,
        reused: true
      }, 'Existing order found', 200);
    }

    const pricing = await getEffectivePlanPricing(db);

    // Get monthly price from configuration, converted to paise for Razorpay
    const monthlyPrice = (pricing as Record<string, number>)[plan]
      ? Math.round((pricing as Record<string, number>)[plan] * 100)
      : 0;
    if (!monthlyPrice) {
      return errorResponse({
        code: 'INVALID_PLAN',
        message: `Plan '${plan}' is not available`,
        statusCode: 400,
      });
    }

    // Calculate final amount based on billing period
    let finalAmount = monthlyPrice;
    if (billingPeriod === 'annually') {
      // Annual billing with 15% discount
      finalAmount = Math.round(monthlyPrice * 12 * 0.85);
    }

    // SECURITY: NEVER trust frontend pricing - always use server-calculated amount
    const orderAmount = finalAmount;

    // If frontend sent an amount, validate it matches (within 1% tolerance for rounding)
    if (amount && Math.abs(amount - finalAmount) > finalAmount * 0.01) {
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
      console.warn(`[CREATE-ORDER] Amount ₹${orderAmount/100} exceeds Razorpay test mode limit of ₹10,000`);
    }

    console.log('[CREATE-ORDER] Processing order:', { 
      userId,
      plan, 
      billingPeriod, 
      monthlyPrice, 
      finalAmount, 
      orderAmount 
    });

    // Create Razorpay order with short receipt ID (max 40 chars)
    // Format: rcpt_<timestamp>_<first 8 chars of userId>
    const timestamp = Date.now().toString().slice(-10); // Last 10 digits
    const userIdShort = userId.slice(-8); // Last 8 chars of userId
    const receiptId = `rcpt_${timestamp}_${userIdShort}`; // Max 28 chars
    
    console.log('[CREATE-ORDER] Receipt ID:', receiptId, 'Length:', receiptId.length);

    // Create Razorpay order
    let order;
    try {
      console.log('[CREATE-ORDER] Creating Razorpay order...');
      order = await razorpay.orders.create({
        amount: orderAmount,
        currency: 'INR',
        receipt: receiptId,
        notes: {
          userId,
          plan,
          billingPeriod,
          paymentContext: normalizedPaymentContext,
        },
      });
      console.log('[CREATE-ORDER] Razorpay order created:', order.id);
    } catch (rzpError: any) {
      console.error('[CREATE-ORDER] Razorpay order creation failed:', rzpError);
      throw rzpError; // Re-throw to be caught by outer catch
    }

    console.log('[CREATE-ORDER] Order created successfully:', order.id);

    // Store order intent for idempotency and abandoned cart tracking
    const now = new Date();
    await db.collection('order_intents').updateOne(
      { orderId: order.id },
      {
        $set: {
          userId,
          plan,
          billingPeriod,
          paymentContext: normalizedPaymentContext,
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
      plan,
      billingPeriod,
      breakdown: {
        basePrice: orderAmount / 100,
        gatewayFee: Math.round(orderAmount / 100 * 0.025 + 3),
        total: orderAmount / 100,
        currency: 'INR'
      }
    }, 'Order created successfully', 201);

  } catch (error: any) {
    console.error('[CREATE-ORDER] Error caught:', error);
    console.error('[CREATE-ORDER] Error type:', typeof error);
    console.error('[CREATE-ORDER] Error details:', JSON.stringify(error, null, 2));

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

      console.error('[CREATE-ORDER] Razorpay API error:', error.error);
      return errorResponse({
        code: razorpayError.code || 'PAYMENT_ERROR',
        message: description || 'Failed to create payment order. Verify Razorpay key/secret pair and account mode.',
        statusCode: statusCode || 500,
      });
    }

    // Handle standard errors
    if (error instanceof Error) {
      console.error('[CREATE-ORDER] Standard error:', error.message);
      return errorResponse({
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to process order',
        statusCode: 500,
      });
    }

    // Fallback error
    console.error('[CREATE-ORDER] Unknown error type');
    return errorResponse(ApiErrors.INTERNAL_ERROR);
  }
}