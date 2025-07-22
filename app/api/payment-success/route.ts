export const runtime = "nodejs";
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { SubscriptionService } from '@/services/subscriptionService';
import clientPromise from '@/lib/mongodb';
import crypto from 'crypto';

export async function POST(req: Request) {
  console.log('Payment success webhook received');
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));
  
  try {
    const body = await req.json();
    console.log('Payment webhook body:', body);
    
    // During testing, we'll handle the payment success directly
    // In production, you should verify the webhook signature
    if (process.env.NODE_ENV === 'production') {
      const headersList = await headers();
      const signature = headersList.get('x-razorpay-signature');
      if (!signature) {
        return NextResponse.json({ error: 'No signature' }, { status: 400 });
      }
      // TODO: Add webhook signature verification in production
    } else {
      // Development mode - more lenient validation
      console.log('Running in development mode - skipping strict signature validation');
    }

    // Handle payment success
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, userId, username, plan, billingPeriod = 'monthly', isUpgrade = false, isRenewal = false } = body;

    // Validate required fields
    if (!razorpay_payment_id || !razorpay_order_id || !userId || !username || !plan) {
      console.error('Missing required fields:', { razorpay_payment_id, razorpay_order_id, userId, username, plan });
      return NextResponse.json({ 
        error: 'Missing required fields',
        missing: {
          razorpay_payment_id: !razorpay_payment_id,
          razorpay_order_id: !razorpay_order_id,
          userId: !userId,
          username: !username,
          plan: !plan
        }
      }, { status: 400 });
    }

    console.log('Processing payment for:', { userId, username, plan, billingPeriod, isUpgrade, isRenewal });

    // Normalize plan name and set features
    let subscriptionPlan = plan;
    let features = {};
    let maxDevices = 1;
    let cloudStorageLimit = 0;
    
    switch(plan) {
      case 'Basic':
        features = {
          biometrics: false,
          autoSync: false,
          cloudDatabase: false,
          analytics: true,
          prioritySupport: false,
          customSubdomain: false,
          apiAccess: false
        };
        maxDevices = 1;
        cloudStorageLimit = 0; // No cloud storage
        break;
      case 'Pro':
        features = {
          biometrics: false,
          autoSync: false,
          cloudDatabase: true,
          analytics: true,
          prioritySupport: true,
          customSubdomain: true,
          apiAccess: true
        };
        maxDevices = 1;
        cloudStorageLimit = 1024 * 1024 * 1024; // 1GB
        break;
      case 'Enterprise':
        features = {
          biometrics: true,
          autoSync: true,
          cloudDatabase: true,
          analytics: true,
          prioritySupport: true,
          customSubdomain: true,
          apiAccess: true,
          whiteLabel: true,
          dedicatedSupport: true
        };
        maxDevices = 2;
        cloudStorageLimit = -1; // Unlimited
        break;
      default:
        subscriptionPlan = 'Basic';
        features = {
          biometrics: false,
          autoSync: false,
          cloudDatabase: false,
          analytics: true,
          prioritySupport: false,
          customSubdomain: false,
          apiAccess: false
        };
        maxDevices = 1;
        cloudStorageLimit = 0;
    }

    // Calculate subscription expiry based on billing period
    const subscriptionExpiresAt = new Date();
    if (billingPeriod === 'annually') {
      // Annual subscription - add 1 year
      subscriptionExpiresAt.setFullYear(subscriptionExpiresAt.getFullYear() + 1);
    } else {
      // Monthly subscription - add 30 days
      subscriptionExpiresAt.setDate(subscriptionExpiresAt.getDate() + 30);
    }

    console.log('Subscription expiry calculation:', {
      plan,
      billingPeriod,
      startDate: new Date().toISOString(),
      expiryDate: subscriptionExpiresAt.toISOString()
    });

    // Map billing period to subscription type for subscription service
    const subscriptionTypeMap: { [key: string]: 'monthly' | '6months' | 'yearly' } = {
      'monthly': 'monthly',
      'annually': 'yearly'
    };
    const subscriptionType = subscriptionTypeMap[billingPeriod] || 'monthly';

    // Calculate grace period expiry (10 days after subscription ends)
    const gracePeriodExpiresAt = new Date(subscriptionExpiresAt);
    gracePeriodExpiresAt.setDate(gracePeriodExpiresAt.getDate() + 10);

    // Generate username from email
    const email = username;
    const generatedUsername = email?.split('@')[0].replace(/\./g, '') || '';

    // IMPORTANT: Cancel any existing active subscriptions before creating new one
    const db = (await clientPromise).db('AdminDB');
    
    // Find and cancel existing active subscriptions
    const existingSubscriptions = await db.collection('subscriptions').find({
      userId,
      status: 'active'
    }).toArray();

    if (existingSubscriptions.length > 0) {
      console.log(`Found ${existingSubscriptions.length} existing active subscriptions for user ${userId}, canceling them...`);
      
      // Cancel all existing active subscriptions
      await db.collection('subscriptions').updateMany(
        { userId, status: 'active' },
        {
          $set: {
            status: 'superseded',
            supersededDate: new Date(),
            supersededReason: 'New subscription purchased'
          }
        }
      );
    }

    // Create subscription in MongoDB
    const subscriptionService = new SubscriptionService();
    const subscription = await subscriptionService.createSubscription({
      userId,
      username: generatedUsername,
      subscriptionType: subscriptionType, // Use mapped subscription type
      paymentId: razorpay_payment_id,
      receiptUrl: `https://dashboard.razorpay.com/payments/${razorpay_payment_id}`
    });

    // Upsert user in users collection
    // Generate a secure access token (random 48-byte hex string)
    const accessToken = crypto.randomBytes(48).toString('hex');
    await db.collection('users').updateOne(
      { userId },
      {
        $set: {
          userId,
          username: generatedUsername,
          email: username, // using username as email if that's the case
          subscriptionType: 'paid',
          subscriptionPlan,
          billingPeriod, // Add billing period to user record
          subscriptionExpiresAt,
          gracePeriodExpiresAt,
          lastSubscribedAt: new Date(),
          accessToken, // store the generated access token
          status: 'active_subscription',
          maxDevices,
          cloudStorageLimit,
          features
        },
        $setOnInsert: {
          createdAt: new Date(),
          devices: [],
          dataUsage: 0
        }
      },
      { upsert: true }
    );

    // Update subscription record with detailed features
    const subscriptionUpdate: any = {
      subscriptionPlan,
      billingPeriod, // Add billing period to subscription record
      features: {
        ...features,
        maxDevices,
        cloudStorageLimit: cloudStorageLimit === -1 ? 'unlimited' : `${Math.round(cloudStorageLimit / (1024 * 1024 * 1024))}GB`
      },
      status: 'active',
      updatedAt: new Date()
    };

    // If this is an upgrade, preserve the original start date and update end date
    if (isUpgrade) {
      const existingSubscription = await db.collection('subscriptions').findOne({ userId });
      if (existingSubscription) {
        // Keep the original start date, but extend the end date based on remaining days
        subscriptionUpdate.startDate = existingSubscription.startDate;
        // The expiry date calculation should already account for remaining days from upgrade calculation
      }
      subscriptionUpdate.subscriptionPlan = plan; // Update subscriptionPlan field (not plan)
      subscriptionUpdate.isUpgraded = true;
      subscriptionUpdate.upgradedDate = new Date();
      
      // Also update the users collection with new plan
      await db.collection('users').updateOne(
        { userId },
        {
          $set: {
            subscriptionPlan: plan, // Update subscriptionPlan in users collection too
            updatedAt: new Date()
          }
        }
      );
    } else if (isRenewal) {
      // For renewals, extend the subscription from current end date or now (whichever is later)
      const existingSubscription = await db.collection('subscriptions').findOne({ userId });
      if (existingSubscription) {
        subscriptionUpdate.startDate = existingSubscription.startDate; // Keep original start date
        
        // Calculate new expiry date from the later of current expiry date or now
        const currentExpiryDate = new Date(existingSubscription.expiryDate || existingSubscription.endDate);
        const today = new Date();
        const renewalStartDate = currentExpiryDate > today ? currentExpiryDate : today;
        
        // Calculate new expiry date based on billing period
        const newExpiryDate = new Date(renewalStartDate);
        if (billingPeriod === 'annually') {
          newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
        } else {
          newExpiryDate.setDate(newExpiryDate.getDate() + 30);
        }
        
        subscriptionUpdate.expiryDate = newExpiryDate;
        subscriptionUpdate.endDate = newExpiryDate; // Also set endDate for consistency
        subscriptionUpdate.gracePeriodExpiresAt = new Date(newExpiryDate.getTime() + (10 * 24 * 60 * 60 * 1000)); // 10 days grace period
        subscriptionUpdate.isRenewed = true;
        subscriptionUpdate.renewedDate = new Date();
        subscriptionUpdate.lastRenewalDate = new Date();
      }
    } else {
      // New subscription
      subscriptionUpdate.expiryDate = subscriptionExpiresAt;
      subscriptionUpdate.gracePeriodExpiresAt = gracePeriodExpiresAt;
    }

    await db.collection('subscriptions').updateOne(
      { userId },
      { $set: subscriptionUpdate },
      { upsert: true }
    );

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
      redirectUrl: '/download'
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      { error: 'Error processing payment' },
      { status: 500 }
    );
  }
}