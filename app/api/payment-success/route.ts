export const runtime = "nodejs";
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { SubscriptionService } from '@/services/subscriptionService';
import clientPromise from '@/lib/mongodb';
import { createUserDatabase } from '@/lib/RailwayDbprovision';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // During testing, we'll handle the payment success directly
    // In production, you should verify the webhook signature
    if (process.env.NODE_ENV === 'production') {
      const headersList = await headers();
      const signature = headersList.get('x-razorpay-signature');
      if (!signature) {
        return NextResponse.json({ error: 'No signature' }, { status: 400 });
      }
      // TODO: Add webhook signature verification in production
    }

    // Handle payment success
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, userId, username, plan } = body;

    // Normalize plan name
    let normalizedPlan = plan?.toLowerCase().replace(/\s/g, '');
    if (!['monthly', '6months', 'yearly'].includes(normalizedPlan)) {
      normalizedPlan = 'monthly'; // fallback or handle error
    }

    // Generate username from email
    const email = username;
    const generatedUsername = email?.split('@')[0].replace(/\./g, '') || '';

    // Create subscription in MongoDB
    const subscriptionService = new SubscriptionService();
    const subscription = await subscriptionService.createSubscription({
      userId,
      username: generatedUsername,
      subscriptionType: normalizedPlan,
      paymentId: razorpay_payment_id,
      receiptUrl: `https://dashboard.razorpay.com/payments/${razorpay_payment_id}`
    });

    // Upsert user in users collection
    const db = (await clientPromise).db('AdminDB');
    await db.collection('users').updateOne(
      { userId },
      {
        $set: {
          userId,
          username: generatedUsername,
          email: username, // using username as email if that's the case
          lastSubscribedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        }
      },
      { upsert: true }
    );

    // Create Azure SQL database for the user
    try {
      await createUserDatabase(generatedUsername);
      // Mark dbProvisioned true in subscription
      await subscriptionService.updateSubscription(userId, { dbProvisioned: true });
    } catch (dbError) {
      console.error('Azure DB provisioning failed:', dbError);
      // Optionally, update subscription with error info
      await subscriptionService.updateSubscription(userId, { dbProvisioned: false });
    }

    console.log('Payment successful and subscription created:', {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      subscription
    });

    // Return success with redirect URL
    return NextResponse.json({ 
      success: true,
      message: 'Payment processed and subscription created successfully',
      subscription,
      redirectUrl: '/app/dashboard'
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      { error: 'Error processing payment' },
      { status: 500 }
    );
  }
} 