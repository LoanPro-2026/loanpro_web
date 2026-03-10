import { ObjectId } from 'mongodb';
import { clerkClient } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import { enforceAdminAccess, getAdminErrorStatus } from '@/lib/adminAuth';
import { invalidateAdminCacheByTags } from '@/lib/adminResponseCache';
import { writeAdminAuditLog } from '@/lib/adminAudit';

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function parseObjectId(rawId: string) {
  if (!ObjectId.isValid(rawId)) {
    throw new Error('Invalid user ID');
  }

  return new ObjectId(rawId);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await enforceAdminAccess(request, {
      permission: 'users:read',
      rateLimitKey: 'users:item:get',
      limit: 100,
      windowMs: 60_000,
    });

    const { userId } = await params;
    const dbId = parseObjectId(userId);
    const { db } = await connectToDatabase();

    const user = await db.collection('users').findOne({ _id: dbId });
    if (!user) {
      return json({ success: false, error: 'User not found' }, 404);
    }

    const subscriptions = await db
      .collection('subscriptions')
      .find({ userId: user.userId })
      .sort({ createdAt: -1 })
      .toArray();

    return json({ success: true, user: { ...user, subscriptions } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch user';
    const status = message === 'Invalid user ID' ? 400 : getAdminErrorStatus(error);
    return json({ success: false, error: message }, status);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await enforceAdminAccess(request, {
      permission: 'users:write',
      rateLimitKey: 'users:item:patch',
      limit: 50,
      windowMs: 60_000,
    });

    const { userId } = await params;
    const dbId = parseObjectId(userId);
    const body = await request.json();

    const patch: Record<string, unknown> = {};

    const textFields = ['userId', 'username', 'email', 'fullName', 'accessToken', 'status'];
    for (const field of textFields) {
      if (body?.[field] !== undefined) {
        const value = normalizeText(body[field]);
        patch[field] = field === 'email' ? value.toLowerCase() : value;
      }
    }

    if (body?.banned !== undefined) patch.banned = Boolean(body.banned);
    if (body?.hasUsedTrial !== undefined) patch.hasUsedTrial = Boolean(body.hasUsedTrial);
    if (body?.trialStartedAt !== undefined) {
      patch.trialStartedAt = body.trialStartedAt ? new Date(body.trialStartedAt) : null;
    }
    if (body?.devices !== undefined && Array.isArray(body.devices)) patch.devices = body.devices;
    if (body?.dataUsage !== undefined) {
      const usage = Number(body.dataUsage);
      if (!Number.isFinite(usage) || usage < 0) {
        return json({ success: false, error: 'dataUsage must be a non-negative number' }, 400);
      }
      patch.dataUsage = usage;
    }

    if (Object.keys(patch).length === 0) {
      return json({ success: false, error: 'No updatable fields provided' }, 400);
    }

    patch.updatedAt = new Date();

    const { db } = await connectToDatabase();

    const existing = await db.collection('users').findOne({ _id: dbId });
    if (!existing) {
      return json({ success: false, error: 'User not found' }, 404);
    }

    const nextUserId = typeof patch.userId === 'string' ? patch.userId : existing.userId;
    const nextEmail = typeof patch.email === 'string' ? patch.email : existing.email;
    const nextUsername = typeof patch.username === 'string' ? patch.username : existing.username;

    const conflict = await db.collection('users').findOne({
      _id: { $ne: dbId },
      $or: [{ userId: nextUserId }, { email: nextEmail }, { username: nextUsername }],
    });

    if (conflict) {
      return json({ success: false, error: 'Another user already uses this userId, username, or email' }, 409);
    }

    await db.collection('users').updateOne({ _id: dbId }, { $set: patch });

    if (patch.userId && patch.userId !== existing.userId) {
      await db.collection('subscriptions').updateMany(
        { userId: existing.userId },
        { $set: { userId: patch.userId, updatedAt: new Date() } }
      );
      await db.collection('payments').updateMany(
        { userId: existing.userId },
        { $set: { userId: patch.userId, updatedAt: new Date() } }
      );
      await db.collection('order_intents').updateMany(
        { userId: existing.userId },
        { $set: { userId: patch.userId, updatedAt: new Date() } }
      );
    }

    await writeAdminAuditLog({
      actorEmail: admin.email,
      action: 'users.update',
      targetType: 'user',
      targetId: userId,
      details: patch,
    });

    invalidateAdminCacheByTags(['users', 'subscriptions', 'payments', 'dashboard', 'analytics']);

    const updated = await db.collection('users').findOne({ _id: dbId });
    return json({ success: true, user: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update user';
    const status = message === 'Invalid user ID' ? 400 : getAdminErrorStatus(error);
    return json({ success: false, error: message }, status);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await enforceAdminAccess(request, {
      permission: 'users:write',
      rateLimitKey: 'users:item:delete',
      limit: 20,
      windowMs: 60_000,
    });

    const { userId } = await params;
    const dbId = parseObjectId(userId);
    const { db, client } = await connectToDatabase();

    const existing = await db.collection('users').findOne({ _id: dbId });
    if (!existing) {
      return json({ success: false, error: 'User not found' }, 404);
    }

    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        await db.collection('subscriptions').deleteMany({ userId: existing.userId }, { session });
        await db.collection('payments').deleteMany({ userId: existing.userId }, { session });
        await db.collection('order_intents').deleteMany({ userId: existing.userId }, { session });
        await db.collection('cancellations').deleteMany({ userId: existing.userId }, { session });
        await db.collection('support_tickets').deleteMany({ userId: existing.userId }, { session });
        await db.collection('users').deleteOne({ _id: dbId }, { session });
      });
    } finally {
      await session.endSession();
    }

    // Keep identity provider in sync, but do not fail hard if Clerk delete errors.
    try {
      await (await clerkClient()).users.deleteUser(existing.userId);
    } catch (clerkDeleteError) {
      console.error('Failed to delete Clerk user during admin delete:', clerkDeleteError);
    }

    await writeAdminAuditLog({
      actorEmail: admin.email,
      action: 'users.delete',
      targetType: 'user',
      targetId: userId,
      details: { userId: existing.userId, email: existing.email },
    });

    invalidateAdminCacheByTags(['users', 'subscriptions', 'payments', 'dashboard', 'analytics']);

    return json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete user';
    const status = message === 'Invalid user ID' ? 400 : getAdminErrorStatus(error);
    return json({ success: false, error: message }, status);
  }
}
