export const runtime = "nodejs";
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { auth } from '@clerk/nextjs/server';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan, billingPeriod = 'monthly', amount } = await req.json();
    
    // Define plan prices (monthly rates)
    const planPrices: { [key: string]: number } = {
      'Basic': 499,
      'Pro': 999,
      'Enterprise': 1499,
    };

    const monthlyPrice = planPrices[plan];
    if (!monthlyPrice) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Calculate final amount based on billing period
    let finalAmount = monthlyPrice;
    if (billingPeriod === 'annually') {
      // Annual billing with 15% discount
      finalAmount = Math.round(monthlyPrice * 12 * 0.85);
    }

    // Use the amount passed from frontend if provided (for consistency)
    const orderAmount = amount || finalAmount;

    console.log('Order calculation:', { 
      plan, 
      billingPeriod, 
      monthlyPrice, 
      finalAmount, 
      orderAmount 
    });

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: orderAmount * 100, // Razorpay expects amount in paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        userId,
        plan,
        billingPeriod,
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Error creating order' },
      { status: 500 }
    );
  }
}