import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import { successResponse, errorResponse, ApiErrors } from '@/lib/apiResponse';
import { validateUpgradeRequest } from '@/lib/validation';
import { RateLimitPresets } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';
import { getSubscriptionEndDate, getBillingPeriod } from '@/lib/subscriptionHelpers';
import { getRazorpayClient } from '@/lib/razorpayClient';
import { enforceRequestRateLimit, parseJsonRequest, toSafeErrorResponse, withRecovery } from '@/lib/apiSafety';

async function resolveUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const { userId } = await auth();
  if (userId) return userId;

  const desktopAccessToken = request.headers.get('x-desktop-access-token')?.trim();
  if (!desktopAccessToken) return null;

  const { db } = await connectToDatabase();
  const user = await db.collection('users').findOne({ accessToken: desktopAccessToken }, { projection: { userId: 1 } });
  return typeof user?.userId === 'string' ? user.userId : null;
}

// Plan pricing (monthly rates in rupees) - matching create-order API
const PLAN_PRICES = {
  Basic: 599,       // ₹599/month
  Pro: 899,         // ₹899/month
  Enterprise: 1399  // ₹1399/month
};

// Payment gateway fee (2.5% + fixed amount) - matches actual Razorpay charges
const GATEWAY_FEE_PERCENTAGE = 0.025; // 2.5%
const GATEWAY_FIXED_FEE = 3; // ₹3 fixed fee (Razorpay standard)

function calculateGatewayFee(amount: number): number {
  // Amount is in rupees, return gateway fee in rupees
  return Math.round((amount * GATEWAY_FEE_PERCENTAGE) + GATEWAY_FIXED_FEE);
}

function calculateUpgradeAmount(
  currentPlan: string,
  newPlan: string,
  daysRemaining: number,
  billingPeriod: 'monthly' | 'annually' = 'monthly',
  currentBillingPeriod: 'monthly' | 'annually' = billingPeriod,
  subscriptionStartDate?: Date // Add parameter to calculate actual billing period
): {
  currentPlanValue: number;
  newPlanValue: number;
  proratedCurrent: number;
  proratedNew: number;
  upgradeAmount: number;
  gatewayFee: number;
  totalAmount: number;
} {
  logger.debug('calculateUpgradeAmount called', 'UPGRADE_PLAN', { currentPlan, newPlan, daysRemaining, billingPeriod, currentBillingPeriod });
  
  const currentMonthlyPrice = currentPlan === 'trial' ? 0 : PLAN_PRICES[currentPlan as keyof typeof PLAN_PRICES];
  const newMonthlyPrice = PLAN_PRICES[newPlan as keyof typeof PLAN_PRICES];
  
  if (currentPlan !== 'trial' && !currentMonthlyPrice) {
    logger.error('Invalid current plan in upgrade calculation', new Error(`Invalid current plan: ${currentPlan}`), 'UPGRADE_PLAN', { availablePlans: Object.keys(PLAN_PRICES) });
    throw new Error(`Invalid current plan: "${currentPlan}". Available plans: ${Object.keys(PLAN_PRICES).join(', ')}`);
  }
    logger.debug('Upgrade price lookup complete', 'UPGRADE_PLAN', { currentMonthlyPrice, newMonthlyPrice });
  
  if (!newMonthlyPrice) {
    throw new Error('Invalid new plan selected');
  }
  
  const targetPeriodMultiplier = billingPeriod === 'annually' ? 12 : 1;
  const targetDiscountMultiplier = billingPeriod === 'annually' ? 0.85 : 1; // 15% discount for annual
  const currentPeriodMultiplier = currentBillingPeriod === 'annually' ? 12 : 1;
  const currentDiscountMultiplier = currentBillingPeriod === 'annually' ? 0.85 : 1;

  const currentPlanValue = currentPlan === 'trial' ? 0 : Math.round(currentMonthlyPrice * currentPeriodMultiplier * currentDiscountMultiplier);
  const newPlanValue = Math.round(newMonthlyPrice * targetPeriodMultiplier * targetDiscountMultiplier);

  // Calculate total days in current billing period for remaining credit valuation
  let currentPeriodTotalDays: number;
  if (currentBillingPeriod === 'annually') {
    currentPeriodTotalDays = 365;
  } else {
    if (subscriptionStartDate) {
      const startDate = new Date(subscriptionStartDate);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      currentPeriodTotalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    } else {
      const now = new Date();
      currentPeriodTotalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    }
  }

  const remainingCredit = Math.round((currentPlanValue * daysRemaining) / currentPeriodTotalDays);

  // Same billing period => prorated period difference (existing behavior)
  // Billing period switch => full target period price minus remaining credit from current period
  const isBillingPeriodSwitch = currentBillingPeriod !== billingPeriod;
  const proratedCurrent = remainingCredit;
  const proratedNew = isBillingPeriodSwitch
    ? newPlanValue
    : Math.round((newPlanValue * daysRemaining) / currentPeriodTotalDays);

  const upgradeAmount = Math.max(0, proratedNew - proratedCurrent);
  const gatewayFee = calculateGatewayFee(upgradeAmount);
  const totalAmount = upgradeAmount + gatewayFee;
  
  logger.debug('Upgrade calculation computed', 'UPGRADE_PLAN', {
    currentPeriodTotalDays,
    daysRemaining,
    isBillingPeriodSwitch,
    proratedCurrent,
    proratedNew,
    upgradeAmount,
  });
  
  return {
    currentPlanValue,
    newPlanValue,
    proratedCurrent,
    proratedNew,
    upgradeAmount,
    gatewayFee,
    totalAmount
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  logger.info('Upgrade-plan POST request received', 'UPGRADE_PLAN');
  
  try {
    const { client: razorpay, error: razorpayInitError, keyId } = getRazorpayClient();
    if (!razorpay) {
      return NextResponse.json(
        { error: razorpayInitError || 'Payment system is not configured' },
        { status: 500 }
      );
    }

    logger.info('Upgrade Razorpay client initialized', 'UPGRADE_PLAN', {
      keyType: keyId.includes('test') ? 'test' : 'live',
    });

    // Authentication check
    const userId = await resolveUserIdFromRequest(request);
    logger.debug('Upgrade-plan authenticated request', 'UPGRADE_PLAN', { userId });
    
    if (!userId) {
      logger.warn('Unauthorized upgrade attempt', 'UPGRADE_PLAN');
      return errorResponse(ApiErrors.UNAUTHORIZED);
    }

    // Rate limiting
    const rateLimitResponse = enforceRequestRateLimit({
      request,
      scope: 'upgrade-plan',
      limit: RateLimitPresets.PAYMENT.limit,
      windowMs: RateLimitPresets.PAYMENT.windowMs,
      userId,
    });
    if (rateLimitResponse) {
      logger.warn('Rate limit exceeded for upgrade', 'UPGRADE_PLAN', { userId });
      return rateLimitResponse;
    }

    logger.debug('Upgrade-plan rate limit passed', 'UPGRADE_PLAN', { userId });

    // Validate request body
    const parsedBody = await parseJsonRequest<Record<string, any>>(request, { maxBytes: 64 * 1024 });
    if (!parsedBody.ok) {
      logger.warn('Upgrade-plan JSON parse failed', 'UPGRADE_PLAN');
      return parsedBody.response;
    }

    const body = parsedBody.data;
    logger.debug('Upgrade-plan POST request body received', 'UPGRADE_PLAN');

    const validation = validateUpgradeRequest(body);
    logger.debug('Upgrade-plan validation result', 'UPGRADE_PLAN', {
      isValid: validation.isValid(),
      hasError: !validation.isValid(),
    });
    
    if (!validation.isValid()) {
      logger.warn('Upgrade-plan validation failed', 'UPGRADE_PLAN', { error: validation.getFirstError()?.message || 'unknown' });
      return errorResponse({
        code: 'VALIDATION_ERROR',
        message: validation.getFirstError()?.message || 'Validation failed',
        statusCode: 400,
      });
    }

    const { newPlan, billingPeriod = 'monthly' } = body;

    logger.info('Processing plan upgrade', 'UPGRADE_PLAN', { userId, newPlan, billingPeriod });

    const { db } = await connectToDatabase();
    logger.debug('Upgrade-plan database connected', 'UPGRADE_PLAN');
    
    // Get current subscription (include trial status)
    const currentSubscription = await db.collection('subscriptions').findOne({
      userId,
      status: { $in: ['active', 'active_subscription', 'trial'] } // Include trial status
    });

    logger.debug('Upgrade-plan current subscription resolved', 'UPGRADE_PLAN', { userId, hasSubscription: !!currentSubscription });
    
    if (!currentSubscription) {
      return NextResponse.json({ error: 'No active or trial subscription found' }, { status: 404 });
    }
    
    // Extract current plan - check multiple possible field names
    const currentPlan = currentSubscription.subscriptionPlan 
                       || currentSubscription.plan 
                       || currentSubscription.subscriptionType
                       || currentSubscription.planName;

    logger.debug('Upgrade-plan plan extraction', 'UPGRADE_PLAN', {
      subscriptionPlan: currentSubscription.subscriptionPlan,
      plan: currentSubscription.plan,
      subscriptionType: currentSubscription.subscriptionType,
      extracted: currentPlan,
    });
    
    if (!currentPlan) {
      return NextResponse.json({ 
        error: 'Unable to determine current plan',
        debug: { availableFields: Object.keys(currentSubscription) }
      }, { status: 400 });
    }
    
    // Check subscription plan to determine if trial user
    const isTrialUser = currentPlan.toLowerCase() === 'trial';
    logger.debug('Upgrade-plan trial status resolved', 'UPGRADE_PLAN', { userId, isTrialUser });
    
    // Normalize plan names (capitalize first letter to match PLAN_PRICES)
    // For trial users, use their subscriptionType as the target plan, not subscriptionPlan
    const normalizedCurrentPlan = isTrialUser ? 'trial' : currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1).toLowerCase();
    const normalizedNewPlan = newPlan.charAt(0).toUpperCase() + newPlan.slice(1).toLowerCase();

    logger.debug('Upgrade-plan normalized plans', 'UPGRADE_PLAN', { normalizedCurrentPlan, normalizedNewPlan, isTrialUser });
    
    // Special handling for trial users - no pro-rata calculation needed
    if (isTrialUser) {
      logger.info('Processing trial user upgrade', 'UPGRADE_PLAN', { userId, normalizedNewPlan, billingPeriod });
      
      // For trial users, charge the full amount for selected plan and billing period
      const newPlanPrice = PLAN_PRICES[normalizedNewPlan as keyof typeof PLAN_PRICES];
      if (!newPlanPrice) {
        return NextResponse.json({ error: 'Invalid new plan selected' }, { status: 400 });
      }
      
      const periodMultiplier = billingPeriod === 'annually' ? 12 : 1;
      const discountMultiplier = billingPeriod === 'annually' ? 0.85 : 1; // 15% discount for annual
      
      const fullPlanAmount = Math.round(newPlanPrice * periodMultiplier * discountMultiplier);
      const gatewayFee = calculateGatewayFee(fullPlanAmount);
      const totalAmount = fullPlanAmount + gatewayFee;
      
      // Create Razorpay order for trial to paid conversion
      const shortReceiptId = `trial_${Date.now().toString().slice(-8)}`;
      const order = await withRecovery(
        () =>
          razorpay.orders.create({
            amount: totalAmount * 100, // Convert to paise
            currency: 'INR',
            receipt: shortReceiptId,
            notes: {
              type: 'trial_to_paid_conversion',
              userId,
              currentPlan: 'trial',
              newPlan: normalizedNewPlan,
              billingPeriod,
              fullPlanAmount: fullPlanAmount.toString(),
              gatewayFee: gatewayFee.toString(),
              isTrialConversion: 'true'
            }
          }),
        {
          operation: 'razorpay-order-create-trial-upgrade',
          context: 'UPGRADE_PLAN',
          attempts: 2,
          baseDelayMs: 300,
        }
      );
      
      return NextResponse.json({
        orderId: order.id,
        amount: order.amount,
        currency: 'INR',
        calculation: {
          currentPlanValue: 0,
          newPlanValue: fullPlanAmount,
          upgradeAmount: fullPlanAmount, // Full amount, not prorated
          gatewayFee,
          totalAmount,
          currentPlan: 'trial',
          newPlan: normalizedNewPlan,
          billingPeriod,
          isTrialUpgrade: true,
          message: `Converting trial to ${normalizedNewPlan} ${billingPeriod} plan`
        }
      });
    }
    
    // Handle paid plan upgrades
    logger.info('Processing paid plan upgrade', 'UPGRADE_PLAN', { userId, normalizedCurrentPlan, normalizedNewPlan, billingPeriod });
    
    // Check if it's actually an upgrade
    const planHierarchy = { Basic: 1, Pro: 2, Enterprise: 3 };
    
    if (planHierarchy[normalizedNewPlan as keyof typeof planHierarchy] <= planHierarchy[normalizedCurrentPlan as keyof typeof planHierarchy]) {
      return NextResponse.json({ error: 'This is not an upgrade. Use downgrade or cancel instead.' }, { status: 400 });
    }
    
    // Calculate days remaining
    const startDate = new Date(currentSubscription.startDate);
    const endDate = getSubscriptionEndDate(currentSubscription); // Use helper for consistent date field handling
    const today = new Date();
    const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const currentBillingPeriod = getBillingPeriod(currentSubscription);

    logger.debug('Upgrade-plan date calculation', 'UPGRADE_PLAN', { startDate, endDate, today, daysRemaining });
    
    if (daysRemaining <= 0) {
      logger.error('Attempted upgrade with expired subscription', new Error('Subscription expired'), 'UPGRADE_PLAN', { userId, daysRemaining });
      return errorResponse({
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'Current subscription has expired. Please renew first.',
        statusCode: 400,
      });
    }
    
    // Calculate upgrade costs with actual billing period start date
    const calculation = calculateUpgradeAmount(
      normalizedCurrentPlan,
      normalizedNewPlan,
      daysRemaining,
      billingPeriod,
      currentBillingPeriod,
      startDate
    );
    logger.debug('Upgrade-plan calculation result', 'UPGRADE_PLAN', calculation);
    
    // If no payment required (should not happen in upgrade, but safety check)
    if (calculation.totalAmount <= 0) {
      return NextResponse.json({ error: 'No payment required for this change' }, { status: 400 });
    }
    
    // Create Razorpay order
    const shortReceiptId = `upg_${Date.now().toString().slice(-8)}`;

    logger.info('Creating upgrade Razorpay order', 'UPGRADE_PLAN', {
      amount: calculation.totalAmount * 100,
      totalAmount: calculation.totalAmount,
      upgradeAmount: calculation.upgradeAmount,
      gatewayFee: calculation.gatewayFee
    });
    
    const order = await withRecovery(
      () =>
        razorpay.orders.create({
          amount: calculation.totalAmount * 100, // Convert to paise
          currency: 'INR',
          receipt: shortReceiptId, // Keep under 40 characters
          notes: {
            type: 'upgrade',
            userId,
            currentPlan: normalizedCurrentPlan,
            newPlan: normalizedNewPlan,
            billingPeriod,
            daysRemaining: daysRemaining.toString(),
            upgradeAmount: calculation.upgradeAmount.toString(),
            gatewayFee: calculation.gatewayFee.toString()
          }
        }),
      {
        operation: 'razorpay-order-create-paid-upgrade',
        context: 'UPGRADE_PLAN',
        attempts: 2,
        baseDelayMs: 300,
      }
    );

    logger.info('Upgrade Razorpay order created', 'UPGRADE_PLAN', { orderId: order.id, amount: order.amount });
    
    // Store order intent for payment processing (CRITICAL: this ensures amount is available in payment-success route)
    const now = new Date();
    await db.collection('order_intents').updateOne(
      { orderId: order.id },
      {
        $set: {
          userId,
          plan: normalizedNewPlan,
          billingPeriod,
          paymentContext: 'upgrade',
          amount: order.amount, // Store the exact amount from Razorpay (in paise)
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

    logger.info('Upgrade order intent saved', 'UPGRADE_PLAN', { orderId: order.id, amount: order.amount });
    
    return NextResponse.json({
      orderId: order.id,
      amount: order.amount, // Return Razorpay order amount (already in paise)
      currency: 'INR',
      calculation: {
        ...calculation,
        daysRemaining,
        currentPlan: normalizedCurrentPlan,
        newPlan: normalizedNewPlan,
        currentBillingPeriod,
        targetBillingPeriod: billingPeriod
      }
    });
    
  } catch (error: any) {
    logger.error('Upgrade-plan POST failed', error, 'UPGRADE_PLAN');
    const razorpayError = error?.error || error;
    const statusCode = error?.statusCode || error?.error?.statusCode;
    if (statusCode === 401 || razorpayError?.description === 'Authentication failed') {
      return NextResponse.json(
        {
          error: 'Razorpay authentication failed. Verify that RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are a matching pair from the same account/mode.',
          details: razorpayError?.description || 'Authentication failed',
        },
        { status: 502 }
      );
    }

    return toSafeErrorResponse(error, 'UPGRADE_PLAN', 'Failed to process upgrade request');
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const userId = await resolveUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const newPlan = searchParams.get('newPlan');
    const billingPeriod = searchParams.get('billingPeriod') as 'monthly' | 'annually' || 'monthly';

    logger.debug('Upgrade-plan GET request params', 'UPGRADE_PLAN', { newPlan, billingPeriod, userId });
    
    if (!newPlan || !['basic', 'pro', 'enterprise', 'Basic', 'Pro', 'Enterprise'].includes(newPlan)) {
      logger.warn('Upgrade-plan GET invalid plan requested', 'UPGRADE_PLAN', { newPlan });
      return NextResponse.json({ error: 'Invalid plan specified' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    // Get current subscription (include trial status)
    const currentSubscription = await db.collection('subscriptions').findOne({
      userId,
      status: { $in: ['active', 'active_subscription', 'trial'] } // Include trial status
    });

    logger.debug('Upgrade-plan GET current subscription resolved', 'UPGRADE_PLAN', { userId, hasSubscription: !!currentSubscription });
    
    if (!currentSubscription) {
      return NextResponse.json({ error: 'No active or trial subscription found' }, { status: 404 });
    }
    
    // Extract current plan - check multiple possible field names
    const currentPlan = currentSubscription.subscriptionPlan 
                       || currentSubscription.plan 
                       || currentSubscription.subscriptionType
                       || currentSubscription.planName;

    logger.debug('Upgrade-plan GET plan extraction', 'UPGRADE_PLAN', {
      subscriptionPlan: currentSubscription.subscriptionPlan,
      plan: currentSubscription.plan,
      subscriptionType: currentSubscription.subscriptionType,
      planName: currentSubscription.planName,
      extracted: currentPlan
    });
    
    if (!currentPlan) {
      return NextResponse.json({ 
        error: 'Unable to determine current plan. Please contact support.',
        debug: {
          availableFields: Object.keys(currentSubscription)
        }
      }, { status: 400 });
    }
    
    // Check subscription plan to determine if trial user
    const isTrialUser = currentPlan.toLowerCase() === 'trial';

    logger.debug('Upgrade-plan GET current subscription snapshot', 'UPGRADE_PLAN', {
      plan: currentPlan,
      status: currentSubscription.status,
      expiresAt: getSubscriptionEndDate(currentSubscription),
      isTrialUser
    });
    
    // Normalize plan names (capitalize first letter to match PLAN_PRICES)
    // For trial users, use their subscriptionType as the target plan, not subscriptionPlan
    const normalizedCurrentPlan = isTrialUser ? 'trial' : currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1).toLowerCase();
    const normalizedNewPlan = newPlan.charAt(0).toUpperCase() + newPlan.slice(1).toLowerCase();
    
    // Handle trial users - simple full plan pricing
    if (isTrialUser) {
      const newPlanPrice = PLAN_PRICES[normalizedNewPlan as keyof typeof PLAN_PRICES];
      if (!newPlanPrice) {
        return NextResponse.json({ error: 'Invalid new plan selected' }, { status: 400 });
      }
      
      const periodMultiplier = billingPeriod === 'annually' ? 12 : 1;
      const discountMultiplier = billingPeriod === 'annually' ? 0.85 : 1;
      
      const fullPlanAmount = Math.round(newPlanPrice * periodMultiplier * discountMultiplier);
      const gatewayFee = calculateGatewayFee(fullPlanAmount);
      const totalAmount = fullPlanAmount + gatewayFee;
      
      return NextResponse.json({
        calculation: {
          currentPlanValue: 0,
          newPlanValue: fullPlanAmount,
          upgradeAmount: fullPlanAmount, // Full amount, not prorated
          gatewayFee,
          totalAmount,
          currentPlan: 'trial',
          newPlan: normalizedNewPlan,
          billingPeriod,
          isTrialUpgrade: true,
          message: `Converting trial to ${normalizedNewPlan} ${billingPeriod} plan`
        }
      });
    }
    
    // Handle paid plan upgrades - calculate days remaining
    const endDate = new Date(currentSubscription.subscriptionExpiresAt || currentSubscription.endDate || currentSubscription.expiryDate);
    const today = new Date();
    const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    logger.debug('Upgrade-plan GET normalized plans', 'UPGRADE_PLAN', { normalizedCurrentPlan, normalizedNewPlan, isTrialUser, daysRemaining, billingPeriod });
    
    if (daysRemaining <= 0) {
      logger.warn('Upgrade attempted on expired subscription', 'UPGRADE_PLAN', { userId });
      return errorResponse({
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'Current subscription has expired',
        statusCode: 400,
      });
    }
    
    // Get current subscription's billing period
    const currentBillingPeriod = getBillingPeriod(currentSubscription);
    
    // Calculate upgrade costs with correct current->target billing transition behavior
    try {
      const calculation = calculateUpgradeAmount(
        normalizedCurrentPlan,
        normalizedNewPlan,
        daysRemaining,
        billingPeriod,
        currentBillingPeriod,
        new Date(currentSubscription.startDate)
      );
      
      const duration = Date.now() - startTime;
      logger.info('Upgrade calculation completed', 'UPGRADE_PLAN', { 
        userId, 
        duration, 
        upgradeAmount: calculation.upgradeAmount 
      });

      return successResponse({
        calculation: {
          ...calculation,
          daysRemaining,
          currentPlan: normalizedCurrentPlan,
          newPlan: normalizedNewPlan,
          currentBillingPeriod,
          targetBillingPeriod: billingPeriod
        }
      });
    } catch (calcError: any) {
      logger.error('Upgrade-plan GET calculation error', calcError, 'UPGRADE_PLAN');
      return NextResponse.json({ 
        error: calcError.message || 'Failed to calculate upgrade amount',
        details: {
          currentPlan: normalizedCurrentPlan,
          newPlan: normalizedNewPlan,
          availablePlans: Object.keys(PLAN_PRICES)
        }
      }, { status: 400 });
    }
    
  } catch (error: any) {
    logger.error('Upgrade-plan GET failed', error, 'UPGRADE_PLAN');
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}
