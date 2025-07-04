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

    // Fetch current subscription info
    const subscription = await db.collection('subscriptions').findOne({ userId });
    if (!subscription) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });

    // Fetch all subscriptions for payment history
    const paymentHistory = await db.collection('subscriptions')
      .find({ userId })
      .sort({ startDate: -1 })
      .toArray();

    // Return combined info
    return NextResponse.json({
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        lastSubscribedAt: user.lastSubscribedAt,
        accessToken: user.accessToken,
      },
      subscription: {
        plan: subscription.subscriptionType,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
      },
      paymentHistory: paymentHistory.map((sub) => ({
        paymentId: sub.paymentId,
        plan: sub.subscriptionType,
        startDate: sub.startDate,
        endDate: sub.endDate,
        status: sub.status,
        receiptUrl: sub.receiptUrl,
      })),
    });
  } catch (error) {
    console.error('User profile API error:', error);
    return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
  }
} 