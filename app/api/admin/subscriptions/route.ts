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

    // Get all subscriptions with user info
    const subscriptions = await db.collection('subscriptions')
      .aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: 'userId',
            as: 'user'
          }
        },
        {
          $project: {
            _id: 1,
            userId: 1,
            userName: { $arrayElemAt: ['$user.username', 0] },
            userEmail: { $arrayElemAt: ['$user.email', 0] },
            plan: 1,
            status: 1,
            startDate: 1,
            endDate: 1,
            billingPeriod: 1,
            amount: 1,
            createdAt: 1
          }
        },
        { $sort: { createdAt: -1 } }
      ])
      .toArray();

    return new Response(JSON.stringify({ success: true, subscriptions }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return new Response(JSON.stringify({ success: false, error: 'Failed to fetch subscriptions' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
