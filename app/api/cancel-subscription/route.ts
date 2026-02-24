import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Razorpay from 'razorpay';
import { successResponse, errorResponse, ApiErrors } from '@/lib/apiResponse';
import { validateCancellationRequest } from '@/lib/validation';
import { checkRateLimit, RateLimitPresets } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';
import emailService from '@/services/emailService';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Plan pricing (monthly rates)
const PLAN_PRICES = {
  basic: 599,
  pro: 899,
  enterprise: 1399
};

// Payment gateway fee (2.5% + fixed amount) - matches actual Razorpay charges
const GATEWAY_FEE_PERCENTAGE = 0.025; // 2.5%
const GATEWAY_FIXED_FEE = 3; // ₹3 fixed fee (Razorpay standard)

function calculateGatewayFee(amount: number): number {
  // Amount is in rupees, return gateway fee in rupees
  return Math.round((amount * GATEWAY_FEE_PERCENTAGE) + GATEWAY_FIXED_FEE);
}

function calculateRefundAmount(
  plan: string,
  daysUsed: number,
  totalDays: number,
  originalAmount: number,
  billingPeriod: 'monthly' | 'annually' = 'monthly'
): {
  totalPaid: number;
  daysUsed: number;
  daysRemaining: number;
  usedAmount: number;
  grossRefund: number;
  gatewayFeeDeduction: number;
  netRefund: number;
  refundPercentage: number;
} {
  const daysRemaining = Math.max(0, totalDays - daysUsed);
  
  // Calculate amounts
  const usedAmount = Math.round((originalAmount * daysUsed) / totalDays);
  const grossRefund = Math.max(0, originalAmount - usedAmount);
  
  // Deduct gateway fees from refund (processing fees are typically non-refundable)
  const gatewayFeeDeduction = calculateGatewayFee(originalAmount);
  const netRefund = Math.max(0, grossRefund - gatewayFeeDeduction);
  
  const refundPercentage = originalAmount > 0 ? Math.round((netRefund / originalAmount) * 100) : 0;
  
  return {
    totalPaid: originalAmount,
    daysUsed,
    daysRemaining,
    usedAmount,
    grossRefund,
    gatewayFeeDeduction,
    netRefund,
    refundPercentage
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Authentication check
    const { userId } = await auth();
    if (!userId) {
      logger.warn('Unauthorized cancellation attempt', 'CANCEL_SUBSCRIPTION');
      return errorResponse(ApiErrors.UNAUTHORIZED);
    }

    // Rate limiting - prevent rapid cancellation attempts
    const rateLimitKey = `cancel-subscription:${userId}`;
    if (!checkRateLimit(rateLimitKey, 5, 60000)) { // 5 per minute
      logger.warn('Rate limit exceeded for cancellation', 'CANCEL_SUBSCRIPTION', { userId });
      return errorResponse(ApiErrors.RATE_LIMIT);
    }

    // Validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse({
        code: 'INVALID_JSON',
        message: 'Invalid JSON in request body',
        statusCode: 400,
      });
    }

    const validation = validateCancellationRequest(body);
    if (!validation.isValid()) {
      return errorResponse({
        code: 'VALIDATION_ERROR',
        message: validation.getFirstError()?.message || 'Validation failed',
        statusCode: 400,
      });
    }

    const { reason = 'user_requested' } = body;
    
    logger.info('Processing subscription cancellation', 'CANCEL_SUBSCRIPTION', { userId, reason });
    
    const { db } = await connectToDatabase();
    
    // Get current active subscription or trial
    const currentSubscription = await db.collection('subscriptions').findOne({
      userId,
      status: { $in: ['active', 'trial', 'active_subscription'] }
    });
    
    if (!currentSubscription) {
      return NextResponse.json({ error: 'No active subscription or trial found' }, { status: 404 });
    }

    // Handle trial cancellation - completely delete trial user data
    // Handle trial cancellation - delete trial subscription but keep user record without token
    const isTrialSubscription =
      (currentSubscription.subscriptionPlan || '').toLowerCase() === 'trial' ||
      (currentSubscription.plan || '').toLowerCase() === 'trial' ||
      (currentSubscription.subscriptionType || '').toLowerCase() === 'trial' ||
      (currentSubscription.status || '').toLowerCase() === 'trial';

    if (isTrialSubscription) {
      logger.info('Processing trial cancellation - removing access token', 'CANCEL_SUBSCRIPTION', { userId });
      
      // Delete from subscriptions collection
      await db.collection('subscriptions').deleteOne({ _id: currentSubscription._id });
      logger.info('Deleted trial subscription record', 'CANCEL_SUBSCRIPTION');
      
      // Remove access token from user (prevent access without active subscription)
      await db.collection('users').updateOne(
        { userId },
        {
          $set: {
            accessToken: null,
            status: 'trial_cancelled'
          }
        }
      );
      logger.info('Removed user access token', 'CANCEL_SUBSCRIPTION');

      try {
        const userRecord = await db.collection('users').findOne(
          { userId },
          { projection: { email: 1, username: 1, fullName: 1 } }
        );
        const resolvedEmail = userRecord?.email || '';
        const resolvedName =
          userRecord?.fullName ||
          userRecord?.username ||
          (resolvedEmail ? resolvedEmail.split('@')[0] : 'Customer');

        if (resolvedEmail && resolvedEmail.includes('@')) {
          Promise.resolve(
            emailService.sendTrialCancellationEmail({
              userName: resolvedName,
              userEmail: resolvedEmail,
              cancelledAt: new Date()
            })
          ).catch(err => {
            logger.warn('Trial cancellation email failed', 'CANCEL_SUBSCRIPTION', {
              userId,
              error: err instanceof Error ? err.message : 'unknown'
            });
          });
        }
      } catch (emailError) {
        logger.warn('Failed to prepare trial cancellation email', 'CANCEL_SUBSCRIPTION', {
          userId,
          error: emailError instanceof Error ? emailError.message : 'unknown'
        });
      }
      
      return NextResponse.json({
        success: true,
        message: 'Trial subscription cancelled successfully. Access token has been removed.',
        isTrial: true,
        dataDeleted: true
      });
    }
    
    // Handle paid subscription cancellation
    logger.info('Processing paid subscription cancellation - issuing refund and removing access token', 'CANCEL_SUBSCRIPTION');
    
    // Mark subscription as cancelled and remove user access token
    const startDate = new Date(currentSubscription.startDate);
    const endDate = new Date(currentSubscription.endDate);
    const today = new Date();
    
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysUsed = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Get original payment amount from subscription record or payment history
    // Priority 1: Check if subscription has paymentId stored directly
    let paymentHistory = null;
    
    if (currentSubscription.paymentId) {
      // Direct lookup by payment ID stored in subscription
      paymentHistory = await db.collection('payments').findOne({
        paymentId: currentSubscription.paymentId,
        status: 'completed'
      });
      logger.info('Payment found by subscription paymentId', 'CANCEL_SUBSCRIPTION', { 
        paymentId: currentSubscription.paymentId 
      });
    }
    
    if (!paymentHistory) {
      // Priority 2: Try to find by subscription ID
      paymentHistory = await db.collection('payments').findOne({
        userId,
        subscriptionId: currentSubscription._id.toString(),
        status: 'completed'
      });
      if (paymentHistory) {
        logger.info('Payment found by subscriptionId', 'CANCEL_SUBSCRIPTION');
      }
    }

    if (!paymentHistory) {
      // Priority 2b: Try with 'captured' status as well
      paymentHistory = await db.collection('payments').findOne({
        userId,
        subscriptionId: currentSubscription._id.toString(),
        status: 'captured'
      });
      if (paymentHistory) {
        logger.info('Payment found by subscriptionId with captured status', 'CANCEL_SUBSCRIPTION');
      }
    }
    
    if (!paymentHistory) {
      // Priority 3: Fallback to most recent payment for this user by plan and user
      paymentHistory = await db.collection('payments').findOne({
        userId,
        plan: { $regex: new RegExp(currentSubscription.subscriptionType || currentSubscription.plan || 'basic', 'i') },
        status: { $in: ['completed', 'captured'] }
      }, { sort: { createdAt: -1, _id: -1 } });
      
      if (paymentHistory) {
        logger.warn('Using most recent payment by plan type as fallback', 'CANCEL_SUBSCRIPTION', {
          userId,
          plan: currentSubscription.subscriptionType || currentSubscription.plan
        });
      }
    }

    if (!paymentHistory) {
      // Priority 4: Last resort - any recent payment for this user
      paymentHistory = await db.collection('payments').findOne({
        userId,
        status: { $in: ['completed', 'captured'] }
      }, { sort: { createdAt: -1, _id: -1 } });
      
      if (paymentHistory) {
        logger.warn('Using any most recent payment as fallback', 'CANCEL_SUBSCRIPTION', {
          userId,
          paymentId: paymentHistory.paymentId
        });
      }
    }
    
    if (!paymentHistory) {
      // If no payment history found, but it's a paid plan subscription (not trial), estimate from plan
      const planType = (currentSubscription.subscriptionType || currentSubscription.plan || 'basic').toLowerCase();
      
      // Check if this is actually a paid subscription by checking if it has a paymentId or isRenewal/isUpgrade marker
      const hasPaidIndicator = currentSubscription.paymentId || currentSubscription.isRenewal || currentSubscription.isUpgrade;
      
      if (hasPaidIndicator || (planType !== 'trial' && currentSubscription.status === 'active')) {
        // This looks like a paid subscription, estimate the refund
        logger.warn('No payment record found but subscription appears to be paid - estimating from plan', 'CANCEL_SUBSCRIPTION', {
          userId,
          plan: planType,
          hasPaidIndicator
        });
        
        // Estimate based on plan type
        let estimatedAmount = PLAN_PRICES[planType as keyof typeof PLAN_PRICES] || 599;
        const billingPeriod = currentSubscription.billingPeriod || 'monthly';
        
        // For annual billing, multiply by 12 and apply 15% discount
        if (billingPeriod === 'annually') {
          estimatedAmount = Math.round(estimatedAmount * 12 * 0.85);
        }

        // Use estimated amount for refund calculation
        paymentHistory = {
          amount: estimatedAmount,
          razorpayPaymentId: 'estimated',
          paymentId: 'estimated',
          status: 'completed'
        };

        logger.info('Using estimated payment amount for refund calculation', 'CANCEL_SUBSCRIPTION', {
          plan: planType,
          estimatedAmount,
          billingPeriod
        });
      } else {
        // If no payment history found and not a paid subscription, handle as trial
        logger.warn('No payment history found for subscription cancellation, treating as trial/free subscription', 'CANCEL_SUBSCRIPTION');
        
        await db.collection('subscriptions').updateOne(
          { _id: currentSubscription._id },
          {
            $set: {
              status: 'cancelled',
              cancelledDate: new Date(),
              cancellationReason: reason
            }
          }
        );

        return NextResponse.json({
          success: true,
          message: 'Subscription cancelled successfully. No refund applicable.',
          isTrial: true,
          refundCalculation: {
            totalPaid: 0,
            netRefund: 0,
            message: 'No payment record found - trial or free subscription'
          }
        });
      }
    }
    
    let originalAmount = typeof paymentHistory.amount === 'number' ? paymentHistory.amount : 0;
    const paymentLookupId = (paymentHistory as any)?.razorpayPaymentId || (paymentHistory as any)?.paymentId;

    if (originalAmount <= 0 && (paymentHistory as any)?.orderId) {
      const orderIntent = await db.collection('order_intents').findOne({ orderId: (paymentHistory as any).orderId });
      if (orderIntent?.amount) {
        originalAmount = Math.round(orderIntent.amount / 100);
      }
    }

    if (originalAmount <= 0 && paymentLookupId) {
      try {
        const razorpayPayment = await razorpay.payments.fetch(paymentLookupId);
        if (razorpayPayment?.amount) {
          originalAmount = Math.round((razorpayPayment.amount as number) / 100);
        }
      } catch (fetchError) {
        logger.warn('Unable to fetch Razorpay payment amount', 'CANCEL_SUBSCRIPTION', {
          userId,
          paymentId: paymentLookupId,
          error: fetchError instanceof Error ? fetchError.message : 'unknown'
        });
      }
    }

    const billingPeriod = currentSubscription.billingPeriod || 'monthly';

    if (originalAmount <= 0) {
      const planType = (currentSubscription.subscriptionType || currentSubscription.plan || currentSubscription.subscriptionPlan || 'basic').toLowerCase();
      let estimatedAmount = PLAN_PRICES[planType as keyof typeof PLAN_PRICES] || 599;
      if (billingPeriod === 'annually') {
        estimatedAmount = Math.round(estimatedAmount * 12 * 0.85);
      }
      originalAmount = estimatedAmount;
      logger.warn('Fallback to estimated plan amount for refund', 'CANCEL_SUBSCRIPTION', {
        userId,
        plan: planType,
        estimatedAmount,
        billingPeriod
      });
    }
    
    // Calculate refund
    const refundCalculation = calculateRefundAmount(
      currentSubscription.subscriptionType || currentSubscription.plan || currentSubscription.subscriptionPlan || 'basic',
      daysUsed,
      totalDays,
      originalAmount,
      billingPeriod
    );
    
    // Create cancellation record
    const cancellationRecord = {
      userId,
      subscriptionId: currentSubscription._id.toString(),
      originalPaymentId: paymentHistory?.razorpayPaymentId || paymentHistory?.paymentId || 'unknown',
      plan: currentSubscription.subscriptionType || currentSubscription.plan || currentSubscription.subscriptionPlan || 'basic',
      reason,
      requestDate: new Date(),
      ...refundCalculation,
      status: 'pending_review', // Manual review required
      processedDate: null,
      refundPaymentId: null,
      notes: `Cancellation requested by user. Original payment: ${paymentHistory?.razorpayPaymentId || paymentHistory?.paymentId || 'unknown'}`
    };
    
    // Insert cancellation record
    const cancellationResult = await db.collection('cancellations').insertOne(cancellationRecord);
    
    // Update subscription status to 'cancelled'
    await db.collection('subscriptions').updateOne(
      { _id: currentSubscription._id },
      {
        $set: {
          status: 'cancelled',
          cancelledDate: new Date(),
          cancellationReason: reason,
          cancellationId: cancellationResult.insertedId.toString()
        }
      }
    );

    // IMPORTANT: Remove user access token and update user status on cancellation
    // This prevents the user from using the desktop app after cancellation
    await db.collection('users').updateOne(
      { userId },
      {
        $set: {
          status: 'cancelled_subscription',
          subscriptionType: 'cancelled',
          accessToken: null, // Remove access token on cancellation
          cancelledDate: new Date(),
          cancellationReason: reason,
          // Keep subscription plan info for reference
          previousSubscriptionPlan: currentSubscription.subscriptionPlan || currentSubscription.plan,
          previousBillingPeriod: currentSubscription.billingPeriod || 'monthly'
        }
      }
    );

    logger.info('Subscription cancelled', 'CANCEL_SUBSCRIPTION', {
      userId,
      subscriptionId: currentSubscription._id.toString(),
      plan: currentSubscription.subscriptionPlan || currentSubscription.plan,
      refundAmount: refundCalculation.netRefund
    });
    
    // Create refund request in Razorpay (for tracking purposes)
    // Note: Actual refund will be processed manually
    let razorpayRefund = null;
    if (refundCalculation.netRefund > 0 && paymentHistory?.razorpayPaymentId) {
      try {
        // This creates a refund request but doesn't process it immediately
        razorpayRefund = await razorpay.payments.refund(paymentHistory.razorpayPaymentId, {
          amount: refundCalculation.netRefund * 100, // Convert to paise
          speed: 'normal',
          notes: {
            reason: reason,
            userId: userId,
            cancellationId: cancellationResult.insertedId.toString(),
            requestedDate: new Date().toISOString()
          },
          receipt: `refund_${userId}_${Date.now()}`
        });
        
        // Update cancellation record with Razorpay refund ID
        await db.collection('cancellations').updateOne(
          { _id: cancellationResult.insertedId },
          {
            $set: {
              razorpayRefundId: razorpayRefund.id,
              refundStatus: 'initiated'
            }
          }
        );
        
      } catch (razorpayError) {
        logger.error('Razorpay refund creation failed', razorpayError, 'CANCEL_SUBSCRIPTION');
        // Continue without Razorpay refund - manual processing will handle it
      }
    }
    
    // Determine refund message based on amount and test mode
    let refundMessage = 'Subscription cancelled successfully.';
    const hasRefund = refundCalculation.netRefund > 0;
    
    if (hasRefund) {
      const isTestMode = process.env.NODE_ENV === 'development' || process.env.RAZORPAY_KEY_ID?.includes('test');
      
      refundMessage = `Subscription Cancelled Successfully\n\n` +
        `REFUND DETAILS:\n` +
        `Total Paid: ₹${refundCalculation.totalPaid}\n` +
        `Days Used: ${refundCalculation.daysUsed} of ${refundCalculation.daysUsed + refundCalculation.daysRemaining}\n` +
        `Gross Refund: ₹${refundCalculation.grossRefund}\n` +
        `Gateway Fee Deduction: ₹${refundCalculation.gatewayFeeDeduction}\n` +
        `Net Refund Amount: ₹${refundCalculation.netRefund}\n\n` +
        `Processing Time: 3-5 business days\n` +
        `Cancellation ID: ${cancellationResult.insertedId.toString()}\n` +
        (razorpayRefund?.id ? `Razorpay Refund ID: ${razorpayRefund.id}\n` : '') +
        (isTestMode ? '\nTest Mode: Refund will be processed manually' : '');
    } else {
      refundMessage += ' No refund applicable (subscription used fully or trial period).';
    }
    
    // Log cancellation for admin review
    logger.info('Cancellation record created', 'CANCEL_SUBSCRIPTION', {
      cancellationId: cancellationResult.insertedId.toString(),
      userId,
      plan: currentSubscription.subscriptionType || currentSubscription.plan || 'unknown',
      originalPaymentId: paymentHistory?.razorpayPaymentId || paymentHistory?.paymentId || 'unknown',
      totalPaid: refundCalculation.totalPaid,
      daysUsed: refundCalculation.daysUsed,
      daysRemaining: refundCalculation.daysRemaining,
      netRefund: refundCalculation.netRefund,
      razorpayRefundId: razorpayRefund?.id || 'Not created',
      status: 'Pending Manual Review'
    });

    try {
      const userRecord = await db.collection('users').findOne(
        { userId },
        { projection: { email: 1, username: 1, fullName: 1 } }
      );
      const resolvedEmail = userRecord?.email || '';
      const resolvedName =
        userRecord?.fullName ||
        userRecord?.username ||
        (resolvedEmail ? resolvedEmail.split('@')[0] : 'Customer');

      if (resolvedEmail && resolvedEmail.includes('@')) {
        const emailData = {
          userName: resolvedName,
          userEmail: resolvedEmail,
          plan: String(currentSubscription.subscriptionType || currentSubscription.plan || currentSubscription.subscriptionPlan || 'basic'),
          billingPeriod: (currentSubscription.billingPeriod || 'monthly') as 'monthly' | 'annually',
          cancellationId: cancellationResult.insertedId.toString(),
          refundAmount: refundCalculation.netRefund,
          refundStatus: razorpayRefund?.id ? 'initiated' : 'pending_review',
          requestedAt: cancellationRecord.requestDate,
          endDate: currentSubscription.endDate
        };

        Promise.resolve(emailService.sendSubscriptionCancellationEmail(emailData)).catch(err => {
          logger.warn('Cancellation email failed', 'CANCEL_SUBSCRIPTION', {
            userId,
            error: err instanceof Error ? err.message : 'unknown'
          });
        });
      }
    } catch (emailError) {
      logger.warn('Failed to prepare cancellation email', 'CANCEL_SUBSCRIPTION', {
        userId,
        error: emailError instanceof Error ? emailError.message : 'unknown'
      });
    }

    return NextResponse.json({
      success: true,
      message: refundMessage,
      cancellationId: cancellationResult.insertedId.toString(),
      refundCalculation,
      razorpayRefundId: razorpayRefund?.id || null,
      testMode: process.env.NODE_ENV === 'development' || process.env.RAZORPAY_KEY_ID?.includes('test'),
      estimatedProcessingTime: hasRefund ? '3-5 business days' : 'N/A',
      adminInfo: {
        userId,
        userEmail: 'Check Clerk Dashboard',
        originalPaymentId: paymentHistory?.razorpayPaymentId || paymentHistory?.paymentId,
        refundAmount: refundCalculation.netRefund,
        cancellationDate: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Cancel subscription error', error, 'CANCEL_SUBSCRIPTION');
    return errorResponse({
      code: 'CANCELLATION_FAILED',
      message: 'Failed to cancel subscription',
      statusCode: 500,
    });
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let userId: string | null = null;
  
  try {
    const authResult = await auth();
    userId = authResult.userId;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    // Get current subscription (active or trial)
    const currentSubscription = await db.collection('subscriptions').findOne({
      userId,
      status: { $in: ['active', 'trial', 'active_subscription'] }
    });
    
    logger.info('Cancel GET - Found subscription', 'CANCEL_SUBSCRIPTION', {
      found: !!currentSubscription,
      subscriptionType: currentSubscription?.subscriptionType,
      plan: currentSubscription?.plan,
      subscriptionPlan: currentSubscription?.subscriptionPlan,
      billingPeriod: currentSubscription?.billingPeriod,
      startDate: currentSubscription?.startDate,
      endDate: currentSubscription?.endDate || currentSubscription?.expiryDate
    });
    
    if (!currentSubscription) {
      return NextResponse.json({ error: 'No active or trial subscription found' }, { status: 404 });
    }
    
    // Calculate usage and potential refund
    const isTrialSubscription =
      (currentSubscription.subscriptionPlan || '').toLowerCase() === 'trial' ||
      (currentSubscription.plan || '').toLowerCase() === 'trial' ||
      (currentSubscription.subscriptionType || '').toLowerCase() === 'trial' ||
      (currentSubscription.status || '').toLowerCase() === 'trial';

    if (isTrialSubscription) {
      // For trial users, show deletion warning instead of refund calculation
      return NextResponse.json({
        subscription: {
          plan: 'trial',
          startDate: currentSubscription.startDate,
          endDate: currentSubscription.endDate || currentSubscription.expiryDate,
          billingPeriod: 'trial',
          status: 'trial'
        },
        refundCalculation: {
          totalPaid: 0,
          daysUsed: 0,
          daysRemaining: 0,
          usedAmount: 0,
          grossRefund: 0,
          gatewayFeeDeduction: 0,
          netRefund: 0,
          refundPercentage: 0,
          message: 'Trial cancellation will permanently delete all your data. This action cannot be undone.',
          isTrialDeletion: true
        }
      });
    }
    
    const startDate = new Date(currentSubscription.startDate);
    const endDate = new Date(currentSubscription.endDate || currentSubscription.expiryDate);
    const today = new Date();
    
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysUsed = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Get original payment amount
    let paymentHistory = await db.collection('payments').findOne({
      userId,
      $or: [
        { subscriptionId: currentSubscription._id.toString() },
        { razorpayOrderId: { $exists: true } }
      ],
      status: 'completed'
    }) || await db.collection('payments').findOne({
      userId,
      status: 'completed'
    }, { sort: { _id: -1 } });
    
    logger.info('Cancel GET - Payment search', 'CANCEL_SUBSCRIPTION', {
      found: !!paymentHistory,
      amount: paymentHistory?.amount,
      subscriptionId: currentSubscription._id.toString(),
      searchedFor: { userId, status: 'completed' }
    });
    
    // If no payment in payments collection, estimate based on subscription data
    if (!paymentHistory) {
      logger.warn('Cancel GET - No payment found, estimating from subscription', 'CANCEL_SUBSCRIPTION', {
        subscriptionPlan: currentSubscription?.subscriptionPlan,
        plan: currentSubscription?.plan,
        subscriptionType: currentSubscription?.subscriptionType,
        billingPeriod: currentSubscription?.billingPeriod
      });
      
      // Extract plan name from subscription record (check multiple possible field names)
      const planName = (currentSubscription?.subscriptionPlan || 
                       currentSubscription?.plan || 
                       currentSubscription?.subscriptionType || 
                       'pro').toLowerCase();
      
      // Extract billing period from subscription record
      const subBillingPeriod = currentSubscription?.billingPeriod || 'annually';
      
      const monthlyPrice = (PLAN_PRICES as any)[planName] || PLAN_PRICES.pro;
      const estimatedAmount = subBillingPeriod === 'annually' 
        ? Math.round(monthlyPrice * 12 * 0.85) // Annual with 15% discount
        : monthlyPrice;
        
      logger.info('Cancel GET - Estimated payment from subscription', 'CANCEL_SUBSCRIPTION', {
        plan: planName,
        billingPeriod: subBillingPeriod,
        monthlyPrice,
        estimatedAmount
      });
      
      // Create a synthetic payment record for calculation
      paymentHistory = {
        amount: estimatedAmount,
        userId,
        plan: planName,
        billingPeriod: subBillingPeriod
      } as any;
    }
    
    if (!paymentHistory || !paymentHistory.amount) {
      // Calculate days for display even without payment
      const startDate = new Date(currentSubscription.startDate);
      const endDate = new Date(currentSubscription.endDate || currentSubscription.expiryDate);
      const today = new Date();
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysUsed = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return NextResponse.json({
        subscription: {
          plan: currentSubscription.subscriptionType || currentSubscription.plan || 'basic',
          startDate: currentSubscription.startDate,
          endDate: currentSubscription.endDate || currentSubscription.expiryDate,
          billingPeriod: currentSubscription.billingPeriod || 'monthly'
        },
        refundCalculation: {
          totalPaid: 0,
          daysUsed: Math.max(0, daysUsed),
          daysRemaining: Math.max(0, totalDays - daysUsed),
          usedAmount: 0,
          grossRefund: 0,
          gatewayFeeDeduction: 0,
          netRefund: 0,
          refundPercentage: 0,
          message: 'No payment record found - likely trial subscription'
        }
      });
    }
    
    const originalAmount = paymentHistory.amount;
    const billingPeriod = currentSubscription.billingPeriod || paymentHistory.billingPeriod || 'monthly';
    
    // Get plan name with fallback checks
    const planName = currentSubscription.subscriptionType || 
                     currentSubscription.plan || 
                     currentSubscription.subscriptionPlan || 
                     paymentHistory.plan || 
                     'basic';
    
    // Calculate potential refund
    const refundCalculation = calculateRefundAmount(
      planName,
      daysUsed,
      totalDays,
      originalAmount,
      billingPeriod
    );
    
    const duration = Date.now() - startTime;

    logger.info('Cancellation details calculated', 'CANCEL_SUBSCRIPTION', { 
      userId, 
      duration,
      hasRefund: refundCalculation.netRefund > 0 
    });

    return successResponse({
      subscription: {
        plan: currentSubscription.subscriptionType || currentSubscription.plan,
        startDate: currentSubscription.startDate,
        endDate: currentSubscription.endDate,
        billingPeriod
      },
      refundCalculation
    });
    
  } catch (error) {
    logger.error('Cancel calculation failed', error, 'CANCEL_SUBSCRIPTION', { userId });
    return errorResponse(ApiErrors.INTERNAL_ERROR);
  }
} 