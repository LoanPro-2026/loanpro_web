import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

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

export async function POST(
  request: Request,
  { params }: { params: { subscriptionId: string; action: string } }
) {
  try {
    await verifyAdmin();

    const { subscriptionId, action } = params;
    const { db } = await connectToDatabase();

    if (!ObjectId.isValid(subscriptionId)) {
      return new Response(JSON.stringify({ error: 'Invalid subscription ID' }), { status: 400 });
    }

    const subId = new ObjectId(subscriptionId);

    if (action === 'cancel') {
      await db.collection('subscriptions').updateOne(
        { _id: subId },
        {
          $set: {
            status: 'cancelled',
            cancelledAt: new Date(),
            cancelledByAdmin: true
          }
        }
      );
      return new Response(JSON.stringify({ success: true, message: 'Subscription cancelled' }), { status: 200 });
    } else if (action === 'extend') {
      const body = await request.json();
      const { months = 1 } = body;

      const subscription = await db.collection('subscriptions').findOne({ _id: subId });
      if (!subscription) {
        return new Response(JSON.stringify({ error: 'Subscription not found' }), { status: 404 });
      }

      const newEndDate = new Date(subscription.endDate);
      newEndDate.setMonth(newEndDate.getMonth() + months);

      await db.collection('subscriptions').updateOne(
        { _id: subId },
        {
          $set: {
            endDate: newEndDate,
            extendedAt: new Date(),
            extendedByAdmin: true,
            extendedMonths: months
          }
        }
      );

      return new Response(JSON.stringify({ success: true, message: `Subscription extended by ${months} month(s)` }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
  } catch (error) {
    console.error('Error updating subscription:', error);
    return new Response(JSON.stringify({ error: 'Failed to update subscription' }), { status: 500 });
  }
}
