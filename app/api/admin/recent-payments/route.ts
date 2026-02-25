import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { enforceAdminAccess, getAdminErrorStatus } from '@/lib/adminAuth';
import { getAdminCachedResponse, setAdminCachedResponse } from '@/lib/adminResponseCache';

export async function GET(request: Request) {
  try {
    await enforceAdminAccess(request, {
      permission: 'payments:read',
      rateLimitKey: 'payments:recent:get',
      limit: 100,
      windowMs: 60_000,
    });

    const cacheKey = 'admin:payments:recent:v1';
    const cached = getAdminCachedResponse<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const client = await clientPromise;
    const db = client.db('AdminDB');

    // First check if payments collection exists and has data
    const paymentCount = await db.collection('payments').countDocuments();
    console.log('Total payments in database:', paymentCount);

    // Get recent payments with user email lookup
    const payments = await db
      .collection('payments')
      .aggregate([
        {
          $sort: { createdAt: -1 }
        },
        {
          $limit: 10
        },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: 'userId',
            as: 'userInfo'
          }
        },
        {
          $project: {
            _id: 1,
            userId: 1,
            amount: {
              $cond: {
                if: { $gt: ['$amount', 1000] },
                then: { $divide: ['$amount', 100] },
                else: '$amount'
              }
            },
            status: 1,
            plan: 1,
            createdAt: 1,
            razorpayPaymentId: 1,
            userEmail: { $arrayElemAt: ['$userInfo.email', 0] }
          }
        }
      ])
      .toArray();

    console.log('Recent payments fetched:', payments.length);
    console.log('Sample payment:', payments[0]);

    const payload = {
      success: true,
      payments: payments
    };

    setAdminCachedResponse(cacheKey, payload, 10_000, ['payments', 'dashboard']);

    return NextResponse.json(payload);
  } catch (error: unknown) {
    console.error('Error fetching recent payments:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch recent payments' 
      },
      { status: getAdminErrorStatus(error) }
    );
  }
}
