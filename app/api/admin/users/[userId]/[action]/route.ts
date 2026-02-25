import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { enforceAdminAccess, getAdminErrorStatus } from '@/lib/adminAuth';
import { invalidateAdminCacheByTags } from '@/lib/adminResponseCache';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string; action: string }> }
) {
  try {
    await enforceAdminAccess(request, {
      permission: 'users:write',
      rateLimitKey: 'users:action:post',
      limit: 50,
      windowMs: 60_000,
    });

    const { userId, action } = await params;
    const { db } = await connectToDatabase();

    if (!ObjectId.isValid(userId)) {
      return new Response(JSON.stringify({ error: 'Invalid user ID' }), { status: 400 });
    }

    if (action === 'ban') {
      await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        { $set: { banned: true, bannedAt: new Date() } }
      );
      invalidateAdminCacheByTags(['users', 'dashboard']);
      return new Response(JSON.stringify({ success: true, message: 'User banned' }), { status: 200 });
    } else if (action === 'unban') {
      await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        { $set: { banned: false, unbannedAt: new Date() } }
      );
      invalidateAdminCacheByTags(['users', 'dashboard']);
      return new Response(JSON.stringify({ success: true, message: 'User unbanned' }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
  } catch (error) {
    console.error('Error updating user:', error);
    return new Response(JSON.stringify({ error: 'Failed to update user' }), { status: getAdminErrorStatus(error) });
  }
}
