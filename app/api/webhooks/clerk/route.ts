import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import clientPromise from '@/lib/mongodb';
import crypto from 'crypto';
import { logger } from '@/lib/logger';

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
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      logger.error('Clerk webhook secret not configured', new Error('Missing CLERK_WEBHOOK_SECRET'), 'CLERK_WEBHOOK');
      return NextResponse.json(
        { error: 'Webhook configuration error' },
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

    // Get and verify the webhook body
    const payload = await req.json();
    const body = JSON.stringify(payload);

    // Verify webhook signature using Svix
    const wh = new Webhook(WEBHOOK_SECRET);
    let evt: any;

    try {
      evt = wh.verify(body, {
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

    // Handle user.created event
    if (evt.type === 'user.created') {
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

      logger.info('Processing user.created event', 'CLERK_WEBHOOK', { 
        userId: id, 
        email: userEmail,
        username: userName,
        firstName,
        lastName
      });

      // Create MongoDB user record (WITHOUT accessToken)
      // Access token will be generated ONLY after subscription payment
      const db = (await clientPromise).db('AdminDB');
      
      const result = await db.collection('users').updateOne(
        { userId: id },
        {
          $setOnInsert: {
            userId: id,
            username: userName,
            email: userEmail,
            fullName: resolvedFullName,
            // accessToken is NOT generated on signup - only after successful payment
            createdAt: new Date(),
            updatedAt: new Date(),
            devices: [],
            dataUsage: 0
          }
        },
        { upsert: true }
      );

      const duration = Date.now() - startTime;

      if (result.upsertedCount > 0) {
        logger.info('MongoDB user created successfully', 'CLERK_WEBHOOK', { 
          userId: id,
          email: userEmail,
          duration 
        });
        
        return NextResponse.json({ 
          success: true,
          message: 'User created in MongoDB',
          userId: id
        });
      } else {
        // User already existed in MongoDB
        logger.info('MongoDB user already exists', 'CLERK_WEBHOOK', { 
          userId: id,
          duration 
        });
        
        return NextResponse.json({ 
          success: true,
          message: 'User already exists',
          userId: id
        });
      }
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
