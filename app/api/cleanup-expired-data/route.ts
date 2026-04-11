export const runtime = "nodejs";
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { logger } from '@/lib/logger';
import { enforceRequestRateLimit, parseJsonRequest, toSafeErrorResponse } from '@/lib/apiSafety';

const CLEANUP_API_KEY = String(process.env.CLEANUP_API_KEY || '').trim();

export async function POST(req: Request) {
  try {
    const rateLimitResponse = enforceRequestRateLimit({
      request: req,
      scope: 'cleanup-expired-data',
      limit: 30,
      windowMs: 60 * 1000,
    });
    if (rateLimitResponse) return rateLimitResponse;

    // Prefer header-based API key; keep JSON body fallback for existing cron integrations.
    let providedApiKey = (req.headers.get('x-cleanup-api-key') || '').trim();
    if (!providedApiKey) {
      const parsedBody = await parseJsonRequest<Record<string, unknown>>(req, {
        maxBytes: 16 * 1024,
        requireJsonContentType: false,
      });
      const body = parsedBody.ok ? (parsedBody.data as Record<string, any>) : {};
      providedApiKey = typeof body?.apiKey === 'string' ? body.apiKey.trim() : '';
    }

    if (!CLEANUP_API_KEY || providedApiKey !== CLEANUP_API_KEY) {
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
        logger.info('Deleted expired user data', 'CLEANUP_EXPIRED_DATA', { userId: user.userId });
        
      } catch (error) {
        logger.error(`Error deleting data for user ${user.userId}`, error, 'CLEANUP_EXPIRED_DATA');
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
    logger.error('Error during cleanup', error, 'CLEANUP_EXPIRED_DATA');
    return toSafeErrorResponse(error, 'CLEANUP_EXPIRED_DATA', 'Error during cleanup process');
  }
}
