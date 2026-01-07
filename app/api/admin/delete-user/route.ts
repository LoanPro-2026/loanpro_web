import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import clientPromise from '@/lib/mongodb';

export async function DELETE(request: Request) {
  try {
    const { userId: adminUserId } = await auth();
    
    if (!adminUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get admin's email
    const client = await clientPromise;
    const db = client.db('AdminDB');
    
    const adminUser = await db.collection('users').findOne({ userId: adminUserId });
    const adminEmail = process.env.ADMIN_EMAIL || '';
    
    if (!adminUser || adminUser.email !== adminEmail) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    // Prevent admin from deleting themselves
    if (userId === adminUserId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
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

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
