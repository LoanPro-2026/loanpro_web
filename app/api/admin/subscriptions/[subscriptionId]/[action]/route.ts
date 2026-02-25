import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { enforceAdminAccess, getAdminErrorStatus } from '@/lib/adminAuth';
import { invalidateAdminCacheByTags } from '@/lib/adminResponseCache';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ subscriptionId: string; action: string }> }
) {
  try {
    await enforceAdminAccess(request, {
      permission: 'subscriptions:write',
      rateLimitKey: 'subscriptions:action:post',
      limit: 40,
      windowMs: 60_000,
    });

    const { subscriptionId, action } = await params;
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
      invalidateAdminCacheByTags(['subscriptions', 'dashboard', 'analytics']);
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

      invalidateAdminCacheByTags(['subscriptions', 'dashboard', 'analytics']);

      return new Response(JSON.stringify({ success: true, message: `Subscription extended by ${months} month(s)` }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
  } catch (error) {
    console.error('Error updating subscription:', error);
    return new Response(JSON.stringify({ error: 'Failed to update subscription' }), { status: getAdminErrorStatus(error) });
  }
}
