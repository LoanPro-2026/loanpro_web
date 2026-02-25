import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import clientPromise from '@/lib/mongodb';
import { enforceAdminAccess, getAdminErrorStatus } from '@/lib/adminAuth';
import { invalidateAdminCacheByTags } from '@/lib/adminResponseCache';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'your-admin-email@gmail.com';

export async function DELETE(request: Request) {
  try {
    await enforceAdminAccess(request, {
      permission: 'users:write',
      rateLimitKey: 'users:delete',
      limit: 20,
      windowMs: 60_000,
    });

    const client = await clientPromise;
    const db = client.db('AdminDB');

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    const existingUser = await db.collection('users').findOne({ userId });
    if (existingUser?.email === ADMIN_EMAIL) {
      return NextResponse.json(
        { error: 'Cannot delete admin account' },
        { status: 403 }
      );
    }

    // Delete user from MongoDB (subscriptions, payments, user record)
    const session = client.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Delete subscriptions
        await db.collection('subscriptions').deleteMany({ userId });
        
        // Delete payments
        await db.collection('payments').deleteMany({ userId });
        
        // Delete order intents
        await db.collection('order_intents').deleteMany({ userId });
        
        // Delete user record
        await db.collection('users').deleteOne({ userId });
      });
    } finally {
      await session.endSession();
    }

    // Delete user from Clerk
    try {
      await (await clerkClient()).users.deleteUser(userId);
    } catch (clerkError) {
      console.error('Error deleting user from Clerk:', clerkError);
      // Continue even if Clerk deletion fails
    }

    invalidateAdminCacheByTags(['users', 'subscriptions', 'payments', 'dashboard', 'analytics']);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: getAdminErrorStatus(error) }
    );
  }
}
