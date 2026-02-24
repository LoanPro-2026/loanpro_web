import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { logger } from '@/lib/logger';
import emailService from '@/services/emailService';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'your-admin-email@gmail.com';

async function verifyAdmin() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Unauthorized');
  }

  // Fetch user details from Clerk API
  const userResponse = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
    },
  });

  if (!userResponse.ok) {
    throw new Error('Failed to fetch user details');
  }

  const user = await userResponse.json();
  const userEmail = user.email_addresses[0]?.email_address;

  if (userEmail !== ADMIN_EMAIL) {
    throw new Error('Access denied');
  }

  return userEmail;
}

// GET: Fetch all cancellations (with filters)
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    await verifyAdmin();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending_review, refunded, rejected
    const userId = searchParams.get('userId');

    const { db } = await connectToDatabase();

    const filter: any = {};
    if (status) filter.status = status;
    if (userId) filter.userId = userId;

    const cancellations = await db
      .collection('cancellations')
      .find(filter)
      .sort({ requestDate: -1 })
      .limit(100)
      .toArray();

    // Enrich with user email from users collection
    const enrichedCancellations = await Promise.all(
      cancellations.map(async (cancellation) => {
        const user = await db.collection('users').findOne(
          { userId: cancellation.userId },
          { projection: { email: 1, username: 1 } }
        );
        return {
          ...cancellation,
          userEmail: user?.email || 'Unknown',
          username: user?.username || 'Unknown',
        };
      })
    );

    logger.info('Cancellations fetched by admin', 'ADMIN_CANCELLATIONS', {
      count: enrichedCancellations.length,
      filter,
    });

    return NextResponse.json({
      success: true,
      cancellations: enrichedCancellations,
    });
  } catch (error: any) {
    // Handle authentication errors specifically
    if (error.message === 'Unauthorized' || error.message === 'Access denied') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }
    
    logger.error('Admin cancellations GET failed', error, 'ADMIN_CANCELLATIONS');
    return NextResponse.json(
      { error: 'Failed to fetch cancellations' },
      { status: 500 }
    );
  }
}

// PATCH: Update cancellation status (mark as refunded/rejected)
export async function PATCH(request: NextRequest) {
  try {
    // Verify admin authentication
    await verifyAdmin();

    const body = await request.json();
    const { cancellationId, status, refundPaymentId, adminNotes } = body;

    // Validate required fields
    if (!cancellationId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: cancellationId, status' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['pending_review', 'refunded', 'rejected', 'processing'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Find the cancellation
    const cancellation = await db.collection('cancellations').findOne({
      _id: new ObjectId(cancellationId),
    });

    if (!cancellation) {
      return NextResponse.json(
        { error: 'Cancellation not found' },
        { status: 404 }
      );
    }

    // Update cancellation record
    const updateData: any = {
      status,
      processedDate: status === 'refunded' ? new Date() : null,
      adminNotes: adminNotes || null,
    };

    if (refundPaymentId) {
      updateData.refundPaymentId = refundPaymentId;
    }

    await db.collection('cancellations').updateOne(
      { _id: new ObjectId(cancellationId) },
      { $set: updateData }
    );

    // If marked as refunded, optionally update related payment record
    if (status === 'refunded' && cancellation.originalPaymentId) {
      await db.collection('payments').updateOne(
        { razorpayPaymentId: cancellation.originalPaymentId },
        {
          $set: {
            refundStatus: 'refunded',
            refundDate: new Date(),
            refundAmount: cancellation.netRefund,
          },
        }
      );
    }

    if (status === 'refunded') {
      try {
        const user = await db.collection('users').findOne(
          { userId: cancellation.userId },
          { projection: { email: 1, username: 1, fullName: 1 } }
        );
        const resolvedEmail = user?.email || '';
        const resolvedName =
          user?.fullName ||
          user?.username ||
          (resolvedEmail ? resolvedEmail.split('@')[0] : 'Customer');

        if (resolvedEmail) {
          Promise.resolve(
            emailService.sendRefundProcessedEmail({
              userName: resolvedName,
              userEmail: resolvedEmail,
              cancellationId,
              refundAmount: cancellation.netRefund || 0,
              refundPaymentId: refundPaymentId || cancellation.refundPaymentId,
              processedAt: new Date()
            })
          ).catch(err => {
            logger.warn('Refund processed email failed', 'ADMIN_CANCELLATIONS', {
              cancellationId,
              error: err instanceof Error ? err.message : 'unknown'
            });
          });
        }
      } catch (emailError) {
        logger.warn('Failed to prepare refund processed email', 'ADMIN_CANCELLATIONS', {
          cancellationId,
          error: emailError instanceof Error ? emailError.message : 'unknown'
        });
      }
    }

    logger.info('Cancellation status updated by admin', 'ADMIN_CANCELLATIONS', {
      cancellationId,
      userId: cancellation.userId,
      oldStatus: cancellation.status,
      newStatus: status,
      refundAmount: cancellation.netRefund,
    });

    return NextResponse.json({
      success: true,
      message: `Cancellation marked as ${status}`,
      cancellation: {
        ...cancellation,
        ...updateData,
      },
    });
  } catch (error: any) {
    // Handle authentication errors specifically
    if (error.message === 'Unauthorized' || error.message === 'Access denied') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }
    
    logger.error('Admin cancellation update failed', error, 'ADMIN_CANCELLATIONS');
    return NextResponse.json(
      { error: 'Failed to update cancellation status' },
      { status: 500 }
    );
  }
}
