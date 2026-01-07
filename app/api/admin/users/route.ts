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

    // Get all users with their subscription info
    const users = await db.collection('users')
      .aggregate([
        {
          $lookup: {
            from: 'subscriptions',
            localField: 'userId',
            foreignField: 'userId',
            as: 'subscriptionData'
          }
        },
        {
          $addFields: {
            latestSubscription: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: '$subscriptionData',
                    as: 'sub',
                    cond: { $ne: ['$$sub.status', 'expired'] }
                  }
                },
                0
              ]
            }
          }
        },
        {
          $project: {
            _id: 1,
            userId: 1,
            username: 1,
            email: 1,
            createdAt: 1,
            lastLogin: 1,
            subscription: {
              plan: '$latestSubscription.plan',
              status: '$latestSubscription.status',
              endDate: '$latestSubscription.endDate',
              billingPeriod: '$latestSubscription.billingPeriod'
            }
          }
        },
        { $sort: { createdAt: -1 } }
      ])
      .toArray();

    return new Response(JSON.stringify({ success: true, users }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return new Response(JSON.stringify({ success: false, error: 'Failed to fetch users' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
