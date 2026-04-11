export const runtime = "nodejs";
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import clientPromise from '@/lib/mongodb';
import crypto from 'crypto';
import { logger } from '@/lib/logger';
import { enforceRequestRateLimit, parseJsonRequest, toSafeErrorResponse } from '@/lib/apiSafety';

const TRIAL_DURATION_MONTHS = 1;

function buildTrialExtensionContactUrl(email: string): string {
  const query = new URLSearchParams({
    inquiryType: 'pricing',
    email,
    message:
      'I have started the 1-month LoanPro trial and would like to request an extension to 6 months. Please review my account for eligibility.',
    source: 'trial_extension_request',
  });
  return `/support?${query.toString()}`;
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimitResponse = enforceRequestRateLimit({
      request: req,
      scope: 'start-free-trial',
      limit: 6,
      windowMs: 60 * 60 * 1000,
      userId,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const parsedBody = await parseJsonRequest<Record<string, unknown>>(req, { maxBytes: 32 * 1024 });
    if (!parsedBody.ok) return parsedBody.response;

    const body = parsedBody.data as Record<string, any>;
    const username = typeof body.username === 'string' ? body.username : '';
    const email = typeof body.email === 'string' ? body.email : '';
    const fullName = typeof body.fullName === 'string' ? body.fullName : '';

    // Check if user already has an active trial or subscription
    const db = (await clientPromise).db('AdminDB');
    const existingUser = await db.collection('users').findOne({ userId });
    const now = new Date();

    // Canonical state check from subscriptions collection
    const activeSubscription = await db.collection('subscriptions').findOne(
      {
        userId,
        status: { $in: ['active', 'trial', 'active_subscription'] },
        endDate: { $gt: now },
      },
      { sort: { endDate: -1, createdAt: -1 } }
    );

    if (activeSubscription) {
      const activeKind = String(activeSubscription.status || '').toLowerCase() === 'trial' ? 'trial period' : 'subscription';
      return NextResponse.json(
        {
          error: `You already have an active ${activeKind}`,
          expiresAt: activeSubscription.endDate,
          extensionContactUrl: buildTrialExtensionContactUrl(String(existingUser?.email || email || '')),
        },
        { status: 400 }
      );
    }
    
    // Prevent duplicate trials - check if user has EVER used trial before
    if (existingUser) {
      // Check if currently has active trial/subscription
      // IMPORTANT: Check if user has used trial before (historical check)
      if (existingUser.hasUsedTrial === true || existingUser.trialStartedAt) {
        return NextResponse.json({
          error: 'Trial period can only be used once per account',
          message:
            'You have already used your free trial. For genuine conversion evaluation, contact us to request a reviewed extension up to 6 months.',
          previousTrialDate: existingUser.trialStartedAt,
          extensionContactUrl: buildTrialExtensionContactUrl(String(existingUser?.email || email || '')),
        }, { status: 403 });
      }
    }

    const resolvedUsername =
      (typeof username === 'string' ? username.trim() : '') ||
      (typeof existingUser?.username === 'string' ? existingUser.username : '') ||
      (typeof email === 'string' && email ? email.split('@')[0].replace(/\./g, '') : '');

    const resolvedEmail =
      (typeof email === 'string' ? email.trim() : '') ||
      (typeof existingUser?.email === 'string' ? existingUser.email : '');

    const resolvedFullName =
      (typeof fullName === 'string' ? fullName.trim() : '') ||
      (typeof existingUser?.fullName === 'string' ? existingUser.fullName : '');

    // Generate a secure access token
    const accessToken = crypto.randomBytes(48).toString('hex');
    
    // Calculate trial expiry (1 month from now)
    const trialExpiresAt = new Date();
    trialExpiresAt.setMonth(trialExpiresAt.getMonth() + TRIAL_DURATION_MONTHS);

    // Calculate grace period expiry (15 days after trial ends)
    const gracePeriodExpiresAt = new Date(trialExpiresAt);
    gracePeriodExpiresAt.setDate(gracePeriodExpiresAt.getDate() + 15);

    // Upsert user in users collection (only user-specific data, no subscription data)
    // IMPORTANT: Always set accessToken on trial activation (existing users need desktop access during trial)
    await db.collection('users').updateOne(
      { userId },
      {
        $set: {
          userId,
          username: resolvedUsername,
          email: resolvedEmail,
          fullName: resolvedFullName,
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
      message: '1-month Pro trial started successfully!',
      trialExpiresAt,
      accessToken,
      redirectUrl: '/download',
      extensionNote:
        'Need more time? Contact us and we can review eligible accounts for extension up to 6 months.',
      extensionContactUrl: buildTrialExtensionContactUrl(resolvedEmail),
    });

  } catch (error) {
    logger.error('Error starting free trial', error, 'START_FREE_TRIAL');
    return toSafeErrorResponse(error, 'START_FREE_TRIAL', 'Error starting free trial');
  }
}
