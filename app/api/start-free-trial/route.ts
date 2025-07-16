export const runtime = "nodejs";
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import clientPromise from '@/lib/mongodb';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { username, email } = await req.json();

    // Check if user already has an active trial or subscription
    const db = (await clientPromise).db('AdminDB');
    const existingUser = await db.collection('users').findOne({ userId });
    
    if (existingUser && (existingUser.trialExpiresAt > new Date() || existingUser.subscriptionExpiresAt > new Date())) {
      return NextResponse.json({ 
        error: 'User already has an active trial or subscription' 
      }, { status: 400 });
    }

    // Generate username from email
    const generatedUsername = email?.split('@')[0].replace(/\./g, '') || username || '';

    // Generate a secure access token
    const accessToken = crypto.randomBytes(48).toString('hex');
    
    // Calculate trial expiry (14 days from now)
    const trialExpiresAt = new Date();
    trialExpiresAt.setDate(trialExpiresAt.getDate() + 14);

    // Calculate grace period expiry (10 days after trial ends)
    const gracePeriodExpiresAt = new Date(trialExpiresAt);
    gracePeriodExpiresAt.setDate(gracePeriodExpiresAt.getDate() + 10);

    // Upsert user in users collection (keep user-specific fields only)
    await db.collection('users').updateOne(
      { userId },
      {
        $set: {
          userId,
          username: generatedUsername,
          email,
          subscriptionType: 'Pro', // The plan they'll get after trial
          subscriptionPlan: 'trial', // Indicates this is a trial subscription
          accessToken,
          status: 'trial'
        },
        $setOnInsert: {
          createdAt: new Date(),
          devices: [],
          dataUsage: 0
        }
      },
      { upsert: true }
    );

    // Create trial record in subscriptions collection (keep subscription-specific fields)
    await db.collection('subscriptions').insertOne({
      userId,
      username: generatedUsername,
      subscriptionType: 'Pro', // The plan they'll get after trial
      subscriptionPlan: 'trial', // Indicates this is a trial subscription
      status: 'trial',
      startDate: new Date(),
      endDate: trialExpiresAt,
      expiryDate: trialExpiresAt, // Keep for backward compatibility
      trialStartedAt: new Date(),
      trialExpiresAt,
      gracePeriodExpiresAt,
      paymentId: null,
      receiptUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      maxDevices: 1,
      cloudStorageLimit: 0,
      features: {
        biometrics: true,
        autoSync: false,
        cloudDatabase: false,
        analytics: true,
        prioritySupport: true,
        customSubdomain: true,
        apiAccess: true,
        maxDevices: 1,
        cloudStorageLimit: 'None'
      }
    });

    return NextResponse.json({ 
      success: true,
      message: '14-day Pro trial started successfully!',
      trialExpiresAt,
      accessToken,
      features: {
        biometrics: true,
        autoSync: false,
        cloudDatabase: false,
        analytics: true,
        prioritySupport: true,
        customSubdomain: true,
        apiAccess: true,
        maxDevices: 1,
        cloudStorageLimit: 'None'
      },
      redirectUrl: '/download'
    });

  } catch (error) {
    console.error('Error starting free trial:', error);
    return NextResponse.json(
      { error: 'Error starting free trial' },
      { status: 500 }
    );
  }
}
