import { Db } from 'mongodb';
import { logger } from './logger';

/**
 * Ensures critical indexes exist for high-traffic read/write paths.
 * Safe to call repeatedly; MongoDB skips identical index definitions.
 */
export async function ensureDbIndexes(db: Db) {
  try {
    await Promise.all([
      db.collection('users').createIndexes([
        { key: { userId: 1 }, name: 'idx_users_userId_unique', unique: true },
        {
          key: { accessToken: 1 },
          name: 'idx_users_accessToken_unique',
          unique: true,
          sparse: true,
        },
        { key: { email: 1 }, name: 'idx_users_email' },
        { key: { createdAt: -1 }, name: 'idx_users_createdAt_desc' },
      ]),

      db.collection('subscriptions').createIndexes([
        { key: { userId: 1, createdAt: -1 }, name: 'idx_subscriptions_user_created_desc' },
        { key: { userId: 1, status: 1, endDate: -1 }, name: 'idx_subscriptions_user_status_end_desc' },
        { key: { paymentId: 1 }, name: 'idx_subscriptions_paymentId' },
        {
          key: { userId: 1, status: 1 },
          name: 'idx_subscriptions_single_active_per_user',
          unique: true,
          partialFilterExpression: { status: { $in: ['active', 'trial'] } },
        },
      ]),

      db.collection('order_intents').createIndexes([
        { key: { orderId: 1 }, name: 'idx_order_intents_orderId_unique', unique: true },
        {
          key: { userId: 1, status: 1, createdAt: -1 },
          name: 'idx_order_intents_user_status_created_desc',
        },
        { key: { expiresAt: 1 }, name: 'idx_order_intents_ttl', expireAfterSeconds: 0 },
      ]),

      db.collection('payments').createIndexes([
        { key: { paymentId: 1 }, name: 'idx_payments_paymentId_unique', unique: true },
        { key: { orderId: 1 }, name: 'idx_payments_orderId' },
        { key: { userId: 1, createdAt: -1 }, name: 'idx_payments_user_created_desc' },
      ]),

      db.collection('cancellations').createIndexes([
        { key: { userId: 1, requestDate: -1 }, name: 'idx_cancellations_user_request_desc' },
      ]),

      db.collection('device_revokes').createIndexes([
        { key: { userId: 1, revokedAt: -1 }, name: 'idx_device_revokes_user_revoked_desc' },
      ]),
    ]);

    try {
      await db.collection('subscriptions').createIndex(
        { userId: 1, status: 1 },
        {
          name: 'idx_subscriptions_single_active_per_user_legacy',
          unique: true,
          partialFilterExpression: { status: { $in: ['active', 'trial', 'active_subscription'] } },
        }
      );
    } catch (legacyIndexError) {
      logger.warn('Skipped legacy active subscription uniqueness index', 'DB_INDEXES', {
        error: legacyIndexError instanceof Error ? legacyIndexError.message : String(legacyIndexError),
      });
    }

    logger.debug('MongoDB indexes ensured', 'DB_INDEXES');
  } catch (error) {
    logger.error('Failed ensuring MongoDB indexes', error, 'DB_INDEXES');
    throw error;
  }
}
