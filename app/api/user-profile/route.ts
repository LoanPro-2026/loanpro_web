import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const client = await clientPromise;
    const db = client.db('AdminDB');

    // Fetch user info
    const user = await db.collection('users').findOne({ userId });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Fetch current subscription info (including trials)
    const subscriptions = await db.collection('subscriptions').find({
      userId,
      status: 'active' // Both trial and paid subscriptions have status 'active' in your DB
    }).sort({ startDate: -1 }).toArray();
    
    let subscription = null;
    
    // Handle multiple active subscriptions (cleanup)
    if (subscriptions.length > 1) {
      console.log(`Found ${subscriptions.length} active subscriptions for user ${userId}, cleaning up...`);
      
      // Keep the most recent subscription
      subscription = subscriptions[0];
      
      // Mark older subscriptions as superseded
      const olderSubscriptionIds = subscriptions.slice(1).map(s => s._id);
      await db.collection('subscriptions').updateMany(
        { _id: { $in: olderSubscriptionIds } },
        {
          $set: {
            status: 'superseded',
            supersededDate: new Date(),
            supersededReason: 'Multiple active subscriptions cleanup'
          }
        }
      );
      
      console.log(`Cleaned up ${olderSubscriptionIds.length} duplicate active subscriptions`);
    } else if (subscriptions.length === 1) {
      subscription = subscriptions[0];
    }
    
    // Fetch all subscriptions for payment history
    const paymentHistory = await db.collection('subscriptions')
      .find({ userId })
      .sort({ startDate: -1 })
      .toArray();

    // Handle non-subscribed users gracefully
    if (!subscription && paymentHistory.length === 0) {
      return NextResponse.json({
        user: {
          userId: user.userId,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt,
          lastSubscribedAt: user.lastSubscribedAt,
          accessToken: null, // No access token for non-subscribed users
        },
        subscription: null, // No active subscription
        paymentHistory: [],
        isSubscribed: false
      });
    }

    // Return combined info for subscribed users
    return NextResponse.json({
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        lastSubscribedAt: user.lastSubscribedAt,
        accessToken: user.accessToken,
      },
      subscription: subscription ? {
        plan: user.subscriptionPlan || subscription.subscriptionPlan || subscription.plan || subscription.subscriptionType,
        subscriptionType: subscription.subscriptionType, // billing period (monthly/yearly)
        billingPeriod: user.billingPeriod || subscription.billingPeriod || 'monthly',
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate || subscription.expiryDate,
      } : null,
      paymentHistory: paymentHistory.map((sub) => ({
        paymentId: sub.paymentId,
        plan: sub.subscriptionType || sub.plan || sub.subscriptionPlan,
        startDate: sub.startDate,
        endDate: sub.endDate || sub.expiryDate,
        status: sub.status,
        receiptUrl: sub.receiptUrl,
      })),
      isSubscribed: true
    });
  } catch (error) {
    console.error('User profile API error:', error);
    return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
  }
} 