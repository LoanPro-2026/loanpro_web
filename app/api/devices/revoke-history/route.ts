import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    // Get current month start
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Get revoke history for current month
    const revokeHistory = await db.collection('device_revokes').find({
      userId,
      revokedAt: { $gte: currentMonthStart }
    }).toArray();
    
    const revokesThisMonth = revokeHistory.length;
    const canRevoke = revokesThisMonth < 3;
    
    return NextResponse.json({
      success: true,
      revokesThisMonth,
      maxRevokesPerMonth: 3,
      canRevoke,
      remainingRevokes: Math.max(0, 3 - revokesThisMonth),
      revokeHistory: revokeHistory.map(record => ({
        deviceId: record.deviceId,
        deviceName: record.deviceName,
        revokedAt: record.revokedAt,
        reason: record.reason
      }))
    });

  } catch (error) {
    console.error('Revoke history API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch revoke history' },
      { status: 500 }
    );
  }
}
