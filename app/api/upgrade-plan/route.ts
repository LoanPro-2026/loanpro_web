import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Plan pricing (monthly rates) - matching database format
const PLAN_PRICES = {
  Basic: 499,    // Note: Capital 'B' to match database
  Pro: 999,      // Note: Capital 'P' to match database  
  Enterprise: 1499 // Note: Capital 'E' to match database
};

// Payment gateway fee (typically 2-3% + fixed amount)
const GATEWAY_FEE_PERCENTAGE = 0.025; // 2.5%
const GATEWAY_FIXED_FEE = 5; // ₹5 fixed fee

function calculateGatewayFee(amount: number): number {
  return Math.round((amount * GATEWAY_FEE_PERCENTAGE) + GATEWAY_FIXED_FEE);
}

function calculateUpgradeAmount(
  currentPlan: string,
  newPlan: string,
  daysRemaining: number,
  billingPeriod: 'monthly' | 'annually' = 'monthly'
): {
  currentPlanValue: number;
  newPlanValue: number;
  proratedCurrent: number;
  proratedNew: number;
  upgradeAmount: number;
  gatewayFee: number;
  totalAmount: number;
} {
  console.log('calculateUpgradeAmount called with:', { currentPlan, newPlan, daysRemaining, billingPeriod });
  console.log('Available plans in PLAN_PRICES:', Object.keys(PLAN_PRICES));
  
  const currentMonthlyPrice = currentPlan === 'trial' ? 0 : PLAN_PRICES[currentPlan as keyof typeof PLAN_PRICES];
  const newMonthlyPrice = PLAN_PRICES[newPlan as keyof typeof PLAN_PRICES];
  
  console.log('Price lookup results:', { currentMonthlyPrice, newMonthlyPrice });
  
  if (currentPlan !== 'trial' && !currentMonthlyPrice) {
    console.error('Invalid current plan error - currentPlan:', currentPlan, 'Available plans:', Object.keys(PLAN_PRICES));
    throw new Error(`Invalid current plan: "${currentPlan}". Available plans: ${Object.keys(PLAN_PRICES).join(', ')}`);
  }
  
  if (!newMonthlyPrice) {
    throw new Error('Invalid new plan selected');
  }
  
  // Calculate based on billing period
  const periodMultiplier = billingPeriod === 'annually' ? 12 : 1;
  const discountMultiplier = billingPeriod === 'annually' ? 0.85 : 1; // 15% discount for annual
  
  const currentPlanValue = currentPlan === 'trial' ? 0 : Math.round(currentMonthlyPrice * periodMultiplier * discountMultiplier);
  const newPlanValue = Math.round(newMonthlyPrice * periodMultiplier * discountMultiplier);
  
  // Calculate prorated amounts (assuming 30 days in a month)
  const totalDays = billingPeriod === 'annually' ? 365 : 30;
  const proratedCurrent = Math.round((currentPlanValue * daysRemaining) / totalDays);
  const proratedNew = Math.round((newPlanValue * daysRemaining) / totalDays);
  
  // Calculate upgrade amount
  const upgradeAmount = Math.max(0, proratedNew - proratedCurrent);
  const gatewayFee = calculateGatewayFee(upgradeAmount);
  const totalAmount = upgradeAmount + gatewayFee;
  
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
  try {
    console.log('Upgrade plan POST request started');
    
    const { userId } = await auth();
    if (!userId) {
      console.log('Upgrade plan error: No userId found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Upgrade plan request body:', body);
    
    const { newPlan, billingPeriod = 'monthly' } = body;
    
    if (!newPlan || !['basic', 'pro', 'enterprise'].includes(newPlan)) {
      console.log('Upgrade plan error: Invalid plan selected:', newPlan);
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    console.log('Database connected successfully');
    
    // Get current subscription (include trial status)
    const currentSubscription = await db.collection('subscriptions').findOne({
      userId,
      status: { $in: ['active', 'active_subscription', 'trial'] } // Include trial status
    });
    
    console.log('Current subscription found:', currentSubscription);
    
    if (!currentSubscription) {
      console.log('Upgrade plan error: No active subscription found for userId:', userId);
      return NextResponse.json({ error: 'No active or trial subscription found' }, { status: 404 });
    }
    
    // Extract current plan from subscriptionPlan field (this contains the actual plan name)
    const currentPlan = currentSubscription.subscriptionPlan;
    console.log('Current plan from subscriptionPlan field:', currentPlan);
    
    if (!currentPlan) {
      console.log('Upgrade plan error: No plan found in subscriptionPlan field');
      return NextResponse.json({ error: 'Unable to determine current plan' }, { status: 400 });
    }
    
    // Check subscription plan to determine if trial user (subscriptionPlan = 'trial' for trial users)
    const isTrialUser = currentSubscription.subscriptionPlan === 'trial';
    console.log('Is trial user:', isTrialUser);
    
    // Normalize plan names (capitalize first letter to match PLAN_PRICES)
    // For trial users, use their subscriptionType as the target plan, not subscriptionPlan
    const normalizedCurrentPlan = isTrialUser ? 'trial' : currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1).toLowerCase();
    const normalizedNewPlan = newPlan.charAt(0).toUpperCase() + newPlan.slice(1).toLowerCase();
    
    console.log('Normalized plans:', { normalizedCurrentPlan, normalizedNewPlan });
    
    // Special handling for trial users - no pro-rata calculation needed
    if (isTrialUser) {
      console.log('Processing trial user upgrade - converting trial to paid subscription');
      
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
      const order = await razorpay.orders.create({
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
      });
      
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
    console.log('Processing paid plan upgrade');
    
    // Check if it's actually an upgrade
    const planHierarchy = { Basic: 1, Pro: 2, Enterprise: 3 };
    
    if (planHierarchy[normalizedNewPlan as keyof typeof planHierarchy] <= planHierarchy[normalizedCurrentPlan as keyof typeof planHierarchy]) {
      console.log('Upgrade plan error: Not an upgrade');
      return NextResponse.json({ error: 'This is not an upgrade. Use downgrade or cancel instead.' }, { status: 400 });
    }
    
    // Calculate days remaining
    const endDate = new Date(currentSubscription.subscriptionExpiresAt || currentSubscription.endDate || currentSubscription.expiryDate);
    const today = new Date();
    const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    console.log('Date calculation:', { endDate, today, daysRemaining });
    
    if (daysRemaining <= 0) {
      console.log('Upgrade plan error: Subscription expired');
      return NextResponse.json({ error: 'Current subscription has expired' }, { status: 400 });
    }
    
    // Calculate upgrade costs
    console.log('Calculating upgrade amount...');
    const calculation = calculateUpgradeAmount(normalizedCurrentPlan, normalizedNewPlan, daysRemaining, billingPeriod);
    console.log('Upgrade calculation result:', calculation);
    
    // If no payment required (should not happen in upgrade, but safety check)
    if (calculation.totalAmount <= 0) {
      return NextResponse.json({ error: 'No payment required for this change' }, { status: 400 });
    }
    
    // Create Razorpay order
    const shortReceiptId = `upg_${Date.now().toString().slice(-8)}`;
    const order = await razorpay.orders.create({
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
    });
    
    return NextResponse.json({
      orderId: order.id,
      amount: order.amount, // Return Razorpay order amount (already in paise)
      currency: 'INR',
      calculation: {
        ...calculation,
        daysRemaining,
        currentPlan: normalizedCurrentPlan,
        newPlan: normalizedNewPlan
      }
    });
    
  } catch (error) {
    console.error('Upgrade plan error:', error);
    return NextResponse.json(
      { error: 'Failed to process upgrade request' },
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

    const { searchParams } = new URL(request.url);
    const newPlan = searchParams.get('newPlan');
    const billingPeriod = searchParams.get('billingPeriod') as 'monthly' | 'annually' || 'monthly';
    
    if (!newPlan || !['basic', 'pro', 'enterprise'].includes(newPlan)) {
      return NextResponse.json({ error: 'Invalid plan specified' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    // Get current subscription (include trial status)
    const currentSubscription = await db.collection('subscriptions').findOne({
      userId,
      status: { $in: ['active', 'active_subscription', 'trial'] } // Include trial status
    });
    
    if (!currentSubscription) {
      return NextResponse.json({ error: 'No active or trial subscription found' }, { status: 404 });
    }
    
    // Extract current plan from subscriptionPlan field (this contains the actual plan name)
    const currentPlan = currentSubscription.subscriptionPlan;
    
    if (!currentPlan) {
      return NextResponse.json({ error: 'Unable to determine current plan' }, { status: 400 });
    }
    
    // Check subscription plan to determine if trial user (subscriptionPlan = 'trial' for trial users)
    const isTrialUser = currentSubscription.subscriptionPlan === 'trial';
    
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
    
    if (daysRemaining <= 0) {
      return NextResponse.json({ error: 'Current subscription has expired' }, { status: 400 });
    }
    
    // Calculate upgrade costs
    const calculation = calculateUpgradeAmount(normalizedCurrentPlan, normalizedNewPlan, daysRemaining, billingPeriod);
    
    return NextResponse.json({
      calculation: {
        ...calculation,
        daysRemaining,
        currentPlan: normalizedCurrentPlan,
        newPlan: normalizedNewPlan
      }
    });
    
  } catch (error) {
    console.error('Upgrade calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate upgrade cost' },
      { status: 500 }
    );
  }
}
