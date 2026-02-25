import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { enforceAdminAccess, getAdminErrorStatus } from '@/lib/adminAuth';
import { invalidateAdminCacheByTags } from '@/lib/adminResponseCache';

export async function POST(request: Request) {
  try {
    await enforceAdminAccess(request, {
      permission: 'payments:write',
      rateLimitKey: 'payments:fix-amounts',
      limit: 10,
      windowMs: 60_000,
    });

    const client = await clientPromise;
    const db = client.db('AdminDB');

    // Find all payments with amount 0
    const paymentsWithZeroAmount = await db.collection('payments').find({
      amount: 0
    }).toArray();

    let updated = 0;
    let skipped = 0;

    for (const payment of paymentsWithZeroAmount) {
      // Find the corresponding order intent
      const orderIntent = await db.collection('order_intents').findOne({
        orderId: payment.orderId
      });

      if (orderIntent && orderIntent.amount) {
        // Update the payment with the correct amount
        await db.collection('payments').updateOne(
          { _id: payment._id },
          { $set: { amount: orderIntent.amount } }
        );
        updated++;
      } else {
        skipped++;
      }
    }

    invalidateAdminCacheByTags(['payments', 'dashboard', 'analytics']);

    return NextResponse.json({
      success: true,
      message: `Updated ${updated} payments, skipped ${skipped}`,
      totalFound: paymentsWithZeroAmount.length,
      updated,
      skipped
    });
  } catch (error) {
    console.error('Error fixing payment amounts:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fix payment amounts' },
      { status: getAdminErrorStatus(error) }
    );
  }
}
