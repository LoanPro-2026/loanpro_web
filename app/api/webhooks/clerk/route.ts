import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import clientPromise from '@/lib/mongodb';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

function getClerkWebhookSecret(): string {
  const candidates = [
    process.env.CLERK_WEBHOOK_SECRET,
    process.env.CLERK_WEBHOOK_SIGNING_SECRET,
  ];

  for (const candidate of candidates) {
    const normalized = (candidate || '').trim();
    if (normalized) return normalized;
  }

  return '';
}

/**
 * Clerk Webhook Handler
 * Automatically creates MongoDB user when new user signs up via Clerk
 * This prevents race conditions and ensures consistent user data
 * 
 * Setup Instructions:
 * 1. Go to Clerk Dashboard → Webhooks
 * 2. Add endpoint: https://yourdomain.com/api/webhooks/clerk
 * 3. Subscribe to: user.created
 * 4. Copy webhook secret to .env: CLERK_WEBHOOK_SECRET=whsec_...
 */
export async function POST(req: Request) {
  const startTime = Date.now();
  
  try {
    const WEBHOOK_SECRET = getClerkWebhookSecret();

    if (!WEBHOOK_SECRET) {
      logger.error(
        'Clerk webhook secret not configured',
        new Error('Missing CLERK_WEBHOOK_SECRET/CLERK_WEBHOOK_SIGNING_SECRET'),
        'CLERK_WEBHOOK'
      );
      return NextResponse.json(
        {
          error: 'Webhook configuration error',
          message: 'Missing Clerk webhook secret in environment (CLERK_WEBHOOK_SECRET)',
        },
        { status: 500 }
      );
    }

    // Get verification headers
    const headerPayload = req.headers;
    const svix_id = headerPayload.get('svix-id');
    const svix_timestamp = headerPayload.get('svix-timestamp');
    const svix_signature = headerPayload.get('svix-signature');

    if (!svix_id || !svix_timestamp || !svix_signature) {
      logger.warn('Missing svix headers in webhook request', 'CLERK_WEBHOOK');
      return NextResponse.json(
        { error: 'Missing webhook verification headers' },
        { status: 400 }
      );
    }

    // Get and verify webhook body using raw text (required for Svix signature verification)
    const rawBody = await req.text();

    // Verify webhook signature using Svix
    const wh = new Webhook(WEBHOOK_SECRET);
    let evt: any;

    try {
      evt = wh.verify(rawBody, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      });
    } catch (err) {
      logger.error('Webhook signature verification failed', err as Error, 'CLERK_WEBHOOK');
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 400 }
      );
    }

    logger.info('Webhook verified successfully', 'CLERK_WEBHOOK', { type: evt.type });

    // Handle user.created / user.updated events
    if (evt.type === 'user.created' || evt.type === 'user.updated') {
      const {
        id,
        email_addresses,
        username,
        first_name,
        last_name,
        primary_email_address_id,
        public_metadata,
        full_name,
      } = evt.data;
      
      // Extract user information
      const primaryEmail = Array.isArray(email_addresses)
        ? email_addresses.find((entry: any) => entry?.id === primary_email_address_id)
        : null;
      const userEmail = primaryEmail?.email_address || email_addresses?.[0]?.email_address || '';
      const firstName = first_name || '';
      const lastName = last_name || '';
      const derivedFullName = `${firstName} ${lastName}`.trim();
      const resolvedFullName = derivedFullName || full_name || '';
      const userName =
        username ||
        (public_metadata && typeof public_metadata.username === 'string'
          ? public_metadata.username
          : '') ||
        (resolvedFullName ? resolvedFullName.replace(/\s+/g, '') : '') ||
        (userEmail ? userEmail.split('@')[0] : '');

      logger.info('Processing Clerk user event', 'CLERK_WEBHOOK', { 
        userId: id, 
        email: userEmail,
        username: userName,
        eventType: evt.type,
        firstName,
        lastName
      });

      // Create MongoDB user record (WITHOUT accessToken)
      // Access token will be generated ONLY after subscription payment
      const db = (await clientPromise).db('AdminDB');

      const now = new Date();
      const existingUser = await db.collection('users').findOne({ userId: id });

      if (!existingUser) {
        await db.collection('users').insertOne({
          userId: id,
          username: userName,
          email: userEmail,
          fullName: resolvedFullName,
          createdAt: now,
          updatedAt: now,
          devices: [],
          dataUsage: 0,
        });

        const duration = Date.now() - startTime;
        logger.info('MongoDB user created successfully', 'CLERK_WEBHOOK', {
          userId: id,
          email: userEmail,
          username: userName,
          duration,
        });

        return NextResponse.json({
          success: true,
          message: 'User created in MongoDB',
          userId: id,
        });
      }

      const existingEmailPrefix = typeof existingUser.email === 'string' ? existingUser.email.split('@')[0] : '';
      const shouldUpdateUsername =
        !existingUser.username ||
        existingUser.username === existingEmailPrefix ||
        existingUser.username === existingUser.userId;

      const updatePayload: Record<string, unknown> = {
        updatedAt: now,
      };

      if (userEmail && userEmail !== existingUser.email) {
        updatePayload.email = userEmail;
      }

      if (resolvedFullName && resolvedFullName !== existingUser.fullName) {
        updatePayload.fullName = resolvedFullName;
      }

      if (userName && shouldUpdateUsername && userName !== existingUser.username) {
        updatePayload.username = userName;
      }

      if (Object.keys(updatePayload).length > 1) {
        await db.collection('users').updateOne(
          { userId: id },
          { $set: updatePayload }
        );
      }

      const duration = Date.now() - startTime;
      logger.info('MongoDB user synced successfully', 'CLERK_WEBHOOK', {
        userId: id,
        email: userEmail,
        username: userName,
        eventType: evt.type,
        duration,
      });

      return NextResponse.json({
        success: true,
        message: 'User synced in MongoDB',
        userId: id,
      });
    }

    // Handle other webhook events (if needed in future)
    logger.info('Unhandled webhook event type', 'CLERK_WEBHOOK', { type: evt.type });
    return NextResponse.json({ 
      success: true,
      message: 'Event received but not processed',
      type: evt.type
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Webhook processing failed', error as Error, 'CLERK_WEBHOOK', { duration });
    
    return NextResponse.json(
      { 
        error: 'Internal server error processing webhook',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Only allow POST requests
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. This endpoint only accepts POST requests from Clerk webhooks.' },
    { status: 405 }
  );
}
