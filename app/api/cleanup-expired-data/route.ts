export const runtime = "nodejs";
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(req: Request) {
  try {
    // This endpoint should be called by a cron job or scheduler
    // In production, add proper authentication/API key verification
    const { apiKey } = await req.json();
    
    if (apiKey !== process.env.CLEANUP_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = (await clientPromise).db('AdminDB');
    const now = new Date();
    
    // Find users whose grace period has expired
    const expiredUsers = await db.collection('users').find({
      gracePeriodExpiresAt: { $lte: now },
      status: { $ne: 'deleted' }
    }).toArray();

    let deletedUsersCount = 0;
    let deletedDataCount = 0;

    for (const user of expiredUsers) {
      try {
        // Delete user's cloud data (if any)
        // This would integrate with your cloud storage service
        
        // Delete user's subscription records
        await db.collection('subscriptions').deleteMany({ userId: user.userId });
        
        // Delete user's devices
        await db.collection('devices').deleteMany({ userId: user.userId });
        
        // Delete user's data backups (if stored in cloud)
        // await cloudStorageService.deleteUserData(user.userId);
        
        // Mark user as deleted (keep minimal record for audit)
        await db.collection('users').updateOne(
          { userId: user.userId },
          {
            $set: {
              status: 'deleted',
              deletedAt: now,
              // Remove sensitive data
              accessToken: null,
              email: null,
              // Keep minimal data for audit
              deletionReason: 'grace_period_expired'
            },
            $unset: {
              features: "",
              devices: "",
              cloudStorageLimit: "",
              dataUsage: ""
            }
          }
        );

        deletedUsersCount++;
        console.log(`Deleted data for user: ${user.userId}`);
        
      } catch (error) {
        console.error(`Error deleting data for user ${user.userId}:`, error);
      }
    }

    // Clean up old subscription records (older than 1 year)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const oldSubscriptions = await db.collection('subscriptions').deleteMany({
      createdAt: { $lte: oneYearAgo },
      status: 'expired'
    });

    deletedDataCount = oldSubscriptions.deletedCount || 0;

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed successfully',
      deletedUsersCount,
      deletedDataCount,
      timestamp: now
    });

  } catch (error) {
    console.error('Error during cleanup:', error);
    return NextResponse.json(
      { error: 'Error during cleanup process' },
      { status: 500 }
    );
  }
}
