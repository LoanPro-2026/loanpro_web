export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import emailService from '@/services/emailService';
import { logger } from '@/lib/logger';

const REMINDER_DAY_WINDOWS = [7, 3, 1, 0];

function isAuthorized(request: Request) {
  const secret = process.env.RENEWAL_REMINDER_SECRET || process.env.CRON_SECRET;

  if (!secret) {
    return process.env.NODE_ENV !== 'production';
  }

  const bearer = request.headers.get('authorization');
  const internalSecret = request.headers.get('x-internal-secret');
  const expectedBearer = `Bearer ${secret}`;

  return bearer === expectedBearer || internalSecret === secret;
}

function normalizeBillingPeriod(value: unknown): 'monthly' | 'annually' {
  return value === 'annually' ? 'annually' : 'monthly';
}

function normalizePlan(value: unknown): string {
  const raw = String(value || 'Basic').trim();
  if (!raw) return 'Basic';
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function calculateDaysLeft(endDate: Date): number {
  const now = new Date();
  return Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export async function GET(request: Request) {
  const startedAt = Date.now();

  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db('AdminDB');

    const now = new Date();
    const maxWindow = Math.max(...REMINDER_DAY_WINDOWS);
    const searchUntil = new Date(now);
    searchUntil.setDate(searchUntil.getDate() + maxWindow + 1);

    const candidates = await db
      .collection('subscriptions')
      .find({
        status: { $in: ['active', 'active_subscription', 'trial'] },
        endDate: { $gte: now, $lte: searchUntil },
      })
      .toArray();

    let attempted = 0;
    let sent = 0;
    let skipped = 0;

    for (const subscription of candidates) {
      const endDate = new Date(
        subscription.endDate || subscription.subscriptionExpiresAt || subscription.expiryDate || now
      );

      if (Number.isNaN(endDate.getTime())) {
        skipped += 1;
        continue;
      }

      const daysLeft = calculateDaysLeft(endDate);
      if (!REMINDER_DAY_WINDOWS.includes(daysLeft)) {
        skipped += 1;
        continue;
      }

      const userId = String(subscription.userId || '').trim();
      if (!userId) {
        skipped += 1;
        continue;
      }

      const dedupeKey = `renewal-reminder:${userId}:${String(subscription._id)}:${daysLeft}`;
      const alreadySent = await db.collection('notification_events').findOne({ dedupeKey });
      if (alreadySent) {
        skipped += 1;
        continue;
      }

      attempted += 1;

      const user = await db.collection('users').findOne(
        { userId },
        { projection: { email: 1, username: 1, fullName: 1 } }
      );

      const userEmail = String(user?.email || '').trim();
      if (!userEmail.includes('@')) {
        skipped += 1;
        continue;
      }

      const userName =
        String(user?.fullName || user?.username || userEmail.split('@')[0] || 'Customer').trim() ||
        'Customer';

      const billingPeriod = normalizeBillingPeriod(subscription.billingPeriod || subscription.subscriptionType);
      const plan = normalizePlan(subscription.plan || subscription.subscriptionPlan || subscription.subscriptionType);

      const renewalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://loanpro.tech'}/checkout?plan=${encodeURIComponent(
        plan
      )}&billingPeriod=${billingPeriod}&context=renewal`;

      const sentOk = await emailService.sendSubscriptionExpiryReminderEmail({
        userName,
        userEmail,
        plan,
        billingPeriod,
        endDate,
        daysLeft,
        renewalUrl,
      });

      if (!sentOk) {
        skipped += 1;
        continue;
      }

      await db.collection('notification_events').insertOne({
        type: 'renewal_reminder',
        dedupeKey,
        userId,
        subscriptionId: subscription._id,
        daysLeft,
        sentAt: new Date(),
        createdAt: new Date(),
        metadata: {
          plan,
          billingPeriod,
          endDate,
        },
      });

      sent += 1;
    }

    return NextResponse.json({
      success: true,
      scanned: candidates.length,
      attempted,
      sent,
      skipped,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    logger.error('Renewal reminder job failed', error as Error, 'RENEWAL_REMINDERS');
    return NextResponse.json(
      { success: false, error: 'Renewal reminder job failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
