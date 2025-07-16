import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Plan pricing (monthly rates)
const PLAN_PRICES = {
  basic: 499,
  pro: 999,
  enterprise: 1499
};

// Payment gateway fee (5% + fixed amount)
const GATEWAY_FEE_PERCENTAGE = 0.05; // 5%
const GATEWAY_FIXED_FEE = 5; // ₹5 fixed fee

function calculateGatewayFee(amount: number): number {
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
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reason = 'user_requested' } = await request.json();
    
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
    
    // Get original payment amount from payment history
    const paymentHistory = await db.collection('payments').findOne({
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
    if (refundCalculation.netRefund > 0) {
      if (process.env.NODE_ENV === 'development' || process.env.RAZORPAY_KEY_ID?.includes('test')) {
        refundMessage += ` Refund of ₹${refundCalculation.netRefund} will be processed manually within 3-5 business days (Test Mode).`;
      } else {
        refundMessage += ` Refund of ₹${refundCalculation.netRefund} has been initiated and will be processed within 3-5 business days.`;
      }
    } else {
      refundMessage += ' No refund applicable for this cancellation.';
    }

    return NextResponse.json({
      success: true,
      message: refundMessage,
      cancellationId: cancellationResult.insertedId.toString(),
      refundCalculation,
      razorpayRefundId: razorpayRefund?.id || null,
      testMode: process.env.NODE_ENV === 'development' || process.env.RAZORPAY_KEY_ID?.includes('test'),
      estimatedProcessingTime: refundCalculation.netRefund > 0 ? '3-5 business days' : 'N/A'
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
  try {
    const { userId } = await auth();
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
    
    // If no payment in payments collection, check users collection for payment info
    if (!paymentHistory) {
      const userRecord = await db.collection('users').findOne({ userId });
      console.log('Cancel GET - User record check:', {
        found: !!userRecord,
        subscriptionPlan: userRecord?.subscriptionPlan,
        subscriptionType: userRecord?.subscriptionType,
        billingPeriod: userRecord?.billingPeriod
      });
      
      // For annual Pro plan, estimate payment amount based on plan and billing period
      if (userRecord?.subscriptionPlan && userRecord?.billingPeriod) {
        const planName = userRecord.subscriptionPlan.toLowerCase();
        const monthlyPrice = (PLAN_PRICES as any)[planName] || PLAN_PRICES.pro; // default to pro if not found
        const estimatedAmount = userRecord.billingPeriod === 'annually' 
          ? Math.round(monthlyPrice * 12 * 0.85) // Annual with 15% discount
          : monthlyPrice;
          
        console.log('Cancel GET - Estimated payment:', {
          plan: planName,
          billingPeriod: userRecord.billingPeriod,
          monthlyPrice,
          estimatedAmount
        });
        
        // Create a synthetic payment record for calculation
        paymentHistory = {
          amount: estimatedAmount,
          userId,
          plan: userRecord.subscriptionPlan,
          billingPeriod: userRecord.billingPeriod
        } as any;
      }
    }
    
    if (!paymentHistory) {
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
    const billingPeriod = currentSubscription.billingPeriod || 'monthly';
    
    // Calculate potential refund
    const refundCalculation = calculateRefundAmount(
      currentSubscription.subscriptionType || currentSubscription.plan,
      daysUsed,
      totalDays,
      originalAmount,
      billingPeriod
    );
    
    return NextResponse.json({
      subscription: {
        plan: currentSubscription.subscriptionType || currentSubscription.plan,
        startDate: currentSubscription.startDate,
        endDate: currentSubscription.endDate,
        billingPeriod
      },
      refundCalculation
    });
    
  } catch (error) {
    console.error('Cancel calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate cancellation details' },
      { status: 500 }
    );
  }
} 