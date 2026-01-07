import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'your-admin-email@gmail.com';

async function verifyAdmin() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized');
  }

  const userResponse = await fetch(
    `https://api.clerk.com/v1/users/${userId}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      },
    }
  );

  const user = await userResponse.json();
  const userEmail = user.email_addresses[0]?.email_address;

  if (userEmail !== ADMIN_EMAIL) {
    throw new Error('Access denied');
  }

  return userEmail;
}

export async function GET(request: Request) {
  try {
    await verifyAdmin();

    const { db } = await connectToDatabase();

    // Get query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const skip = parseInt(url.searchParams.get('skip') || '0');

    // Build filter
    const filter: any = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Fetch payments with user details
    const payments = await db.collection('payments')
      .aggregate([
        { $match: filter },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $lookup: {
            from: 'subscriptions',
            localField: 'subscriptionId',
            foreignField: '_id',
            as: 'subscription'
          }
        },
        {
          $project: {
            id: { $toString: '$_id' },
            userId: { $toString: '$userId' },
            subscriptionId: { $toString: '$subscriptionId' },
            userName: { $arrayElemAt: ['$user.name', 0] },
            userEmail: { $arrayElemAt: ['$user.email', 0] },
            plan: { $arrayElemAt: ['$subscription.plan', 0] },
            amount: 1,
            currency: 1,
            status: 1,
            razorpayOrderId: 1,
            razorpayPaymentId: 1,
            paymentMethod: 1,
            createdAt: 1,
            completedAt: 1,
            failureReason: 1
          }
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit }
      ])
      .toArray();

    // Get total count
    const totalCount = await db.collection('payments').countDocuments(filter);

    return new Response(JSON.stringify({
      payments,
      pagination: {
        total: totalCount,
        limit,
        skip,
        hasMore: skip + limit < totalCount
      }
    }), { status: 200 });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch payments' }), { status: 500 });
  }
}
