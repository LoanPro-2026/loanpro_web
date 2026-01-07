import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's email from Clerk
    const client = await clientPromise;
    const db = client.db('AdminDB');
    
    // First check if user is admin
    const adminUser = await db.collection('users').findOne({ userId });
    const adminEmail = process.env.ADMIN_EMAIL || '';
    
    if (!adminUser || adminUser.email !== adminEmail) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const { subscriptionId, days } = await request.json();

    if (!subscriptionId || !days) {
      return NextResponse.json(
        { error: 'Missing subscriptionId or days' },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(subscriptionId)) {
      return NextResponse.json(
        { error: 'Invalid subscription ID' },
        { status: 400 }
      );
    }

    // Find the subscription
    const subscription = await db.collection('subscriptions').findOne({
      _id: new ObjectId(subscriptionId)
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Extend the endDate by specified days
    const currentEndDate = new Date(subscription.endDate);
    const newEndDate = new Date(currentEndDate);
    newEndDate.setDate(newEndDate.getDate() + days);

    const result = await db.collection('subscriptions').updateOne(
      { _id: new ObjectId(subscriptionId) },
      {
        $set: {
          endDate: newEndDate,
          updatedAt: new Date()
        }
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'Failed to extend subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Subscription extended by ${days} days`,
      newEndDate: newEndDate.toISOString()
    });
  } catch (error) {
    console.error('Error extending subscription:', error);
    return NextResponse.json(
      { error: 'Failed to extend subscription' },
      { status: 500 }
    );
  }
}
