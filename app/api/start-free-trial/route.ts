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
    
    // Prevent duplicate trials - check if user has EVER used trial before
    if (existingUser) {
      // Check if currently has active trial/subscription
      const now = new Date();
      if (existingUser.trialExpiresAt && new Date(existingUser.trialExpiresAt) > now) {
        return NextResponse.json({ 
          error: 'You already have an active trial period',
          expiresAt: existingUser.trialExpiresAt
        }, { status: 400 });
      }
      if (existingUser.subscriptionExpiresAt && new Date(existingUser.subscriptionExpiresAt) > now) {
        return NextResponse.json({ 
          error: 'You already have an active subscription',
          expiresAt: existingUser.subscriptionExpiresAt
        }, { status: 400 });
      }
      
      // IMPORTANT: Check if user has used trial before (historical check)
      if (existingUser.hasUsedTrial === true || existingUser.trialStartedAt) {
        return NextResponse.json({ 
          error: 'Trial period can only be used once per account',
          message: 'You have already used your free trial. Please subscribe to continue using the service.',
          previousTrialDate: existingUser.trialStartedAt
        }, { status: 403 });
      }
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

    // Upsert user in users collection (only user-specific data, no subscription data)
    await db.collection('users').updateOne(
      { userId },
      {
        $set: {
          userId,
          username: generatedUsername,
          email,
          accessToken,
          hasUsedTrial: true, // Mark that user has used their trial
          trialStartedAt: new Date() // Track when trial started
        },
        $setOnInsert: {
          createdAt: new Date(),
          devices: [],
          dataUsage: 0
        }
      },
      { upsert: true }
    );

    // Create trial record in subscriptions collection (single source of truth for subscription data)
    await db.collection('subscriptions').insertOne({
      userId,
      plan: 'trial',
      billingPeriod: 'monthly', // trials are considered monthly
      status: 'trial',
      startDate: new Date(),
      endDate: trialExpiresAt,
      gracePeriodEndsAt: gracePeriodExpiresAt,
      paymentId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return NextResponse.json({ 
      success: true,
      message: '14-day Pro trial started successfully!',
      trialExpiresAt,
      accessToken,
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
