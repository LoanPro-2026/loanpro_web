import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Razorpay from 'razorpay';
import { successResponse, errorResponse, ApiErrors } from '@/lib/apiResponse';
import { validateCancellationRequest } from '@/lib/validation';
import { checkRateLimit, RateLimitPresets } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Plan pricing (monthly rates)
const PLAN_PRICES = {
  basic: 699,
  pro: 833,
  enterprise: 979
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
      status: 'active' // Both trial and paid subscriptions have status 'active' in your DB
    });
    
    if (!currentSubscription) {
      return NextResponse.json({ error: 'No active subscription or trial found' }, { status: 404 });
    }

    // Handle trial cancellation - completely delete trial user data
    if (currentSubscription.subscriptionPlan === 'trial') {
      console.log('Processing trial cancellation - deleting all trial user data');
      
      // Delete from subscriptions collection
      await db.collection('subscriptions').deleteOne({ _id: currentSubscription._id });
      console.log('Deleted trial subscription record');
      
      // Delete from users collection
      await db.collection('users').deleteOne({ userId });
      console.log('Deleted trial user record');
      
      return NextResponse.json({
        success: true,
        message: 'Trial subscription cancelled successfully. All trial data has been removed.',
        isTrial: true,
        dataDeleted: true
      });
    }
    
    // Calculate usage and refund
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
      // Priority 3: Fallback to most recent completed payment for this user
      // (less reliable but better than nothing)
      paymentHistory = await db.collection('payments').findOne({
        userId,
        status: 'completed'
      }, { sort: { createdAt: -1, _id: -1 } });
      
      if (paymentHistory) {
        logger.warn('Using most recent payment as fallback', 'CANCEL_SUBSCRIPTION', {
          userId,
          paymentId: paymentHistory.paymentId
        });
      }
    }
    
    if (!paymentHistory) {
      // If no payment history found, handle as trial or free subscription
      console.warn('No payment history found for subscription cancellation, treating as trial/free subscription');
      
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
          message: 'No payment record found - likely trial subscription'
        }
      });
    }
    
    const originalAmount = paymentHistory.amount;
    const billingPeriod = currentSubscription.billingPeriod || 'monthly';
    
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

    // IMPORTANT: Also update user status to cancelled
    await db.collection('users').updateOne(
      { userId },
      {
        $set: {
          status: 'cancelled_subscription',
          subscriptionType: 'cancelled',
          cancelledDate: new Date(),
          cancellationReason: reason,
          // Keep subscription plan info for reference
          previousSubscriptionPlan: currentSubscription.subscriptionPlan || currentSubscription.plan,
          previousBillingPeriod: currentSubscription.billingPeriod || 'monthly'
        }
      }
    );

    console.log('Subscription cancelled:', {
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
        console.error('Razorpay refund creation failed:', razorpayError);
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
    console.log('\n========== CANCELLATION RECORD ==========');
    console.log('Cancellation ID:', cancellationResult.insertedId.toString());
    console.log('User ID:', userId);
    console.log('Plan:', currentSubscription.subscriptionType || currentSubscription.plan || 'unknown');
    console.log('Original Payment ID:', paymentHistory?.razorpayPaymentId || paymentHistory?.paymentId || 'unknown');
    console.log('Total Paid:', refundCalculation.totalPaid);
    console.log('Days Used:', refundCalculation.daysUsed);
    console.log('Days Remaining:', refundCalculation.daysRemaining);
    console.log('Net Refund Amount:', refundCalculation.netRefund);
    console.log('Razorpay Refund ID:', razorpayRefund?.id || 'Not created');
    console.log('Status: Pending Manual Review');
    console.log('========================================\n');

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
    console.error('Cancel subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let userId: string | undefined;
  
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
      status: 'active' // Both trial and paid subscriptions have status 'active' in your DB
    });
    
    console.log('Cancel GET - Found subscription:', {
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
    if (currentSubscription.subscriptionPlan === 'trial') {
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
    
    console.log('Cancel GET - Payment search:', {
      found: !!paymentHistory,
      amount: paymentHistory?.amount,
      subscriptionId: currentSubscription._id.toString(),
      searchedFor: { userId, status: 'completed' }
    });
    
    // If no payment in payments collection, estimate based on subscription data
    if (!paymentHistory) {
      console.log('Cancel GET - No payment found, estimating from subscription:', {
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
        
      console.log('Cancel GET - Estimated payment from subscription:', {
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