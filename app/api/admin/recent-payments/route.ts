import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import clientPromise from '@/lib/mongodb';

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

export async function GET() {
  try {
    await verifyAdmin();

    const client = await clientPromise;
    const db = client.db('AdminDB');

    // First check if payments collection exists and has data
    const paymentCount = await db.collection('payments').countDocuments();
    console.log('Total payments in database:', paymentCount);

    // Get recent payments with user email lookup
    const payments = await db
      .collection('payments')
      .aggregate([
        {
          $sort: { createdAt: -1 }
        },
        {
          $limit: 10
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: 'userId',
            as: 'userInfo'
          }
        },
        {
          $project: {
            _id: 1,
            userId: 1,
            amount: {
              $cond: {
                if: { $gt: ['$amount', 1000] },
                then: { $divide: ['$amount', 100] },
                else: '$amount'
              }
            },
            status: 1,
            plan: 1,
            createdAt: 1,
            razorpayPaymentId: 1,
            userEmail: { $arrayElemAt: ['$userInfo.email', 0] }
          }
        }
      ])
      .toArray();

    console.log('Recent payments fetched:', payments.length);
    console.log('Sample payment:', payments[0]);

    return NextResponse.json({
      success: true,
      payments: payments
    });
  } catch (error: unknown) {
    console.error('Error fetching recent payments:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch recent payments' 
      },
      { status: error instanceof Error && error.message === 'Access denied' ? 403 : 500 }
    );
  }
}
