import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getCorsHeaders } from '../devices/cors';

// Cloud backup endpoint for desktop app
export async function POST(req: Request) {
  const corsHeaders = getCorsHeaders(req);
  
  try {
    const { accessToken, backupData, backupType, backupName } = await req.json();
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing accessToken' }, { status: 400, headers: corsHeaders });
    }
    
    const client = await clientPromise;
    const db = client.db('AdminDB');
    
    // Verify access token
    const user = await db.collection('users').findOne({ accessToken });
    if (!user) {
      return NextResponse.json({ error: 'Invalid access token' }, { status: 401, headers: corsHeaders });
    }
    
    // Check subscription limits
    const subscription = await db.collection('subscriptions').findOne({ userId: user.userId });
    if (!subscription || subscription.status !== 'active') {
      return NextResponse.json({ error: 'No active subscription' }, { status: 403, headers: corsHeaders });
    }
    
    // Get current backup count
    const backupCount = await db.collection('backups').countDocuments({ userId: user.userId });
    const maxBackups = getMaxBackupsForPlan(subscription.subscriptionType);
    
    if (backupCount >= maxBackups) {
      // Remove oldest backup
      const oldestBackup = await db.collection('backups').findOne(
        { userId: user.userId },
        { sort: { createdAt: 1 } }
      );
      
      if (oldestBackup) {
        await db.collection('backups').deleteOne({ _id: oldestBackup._id });
      }
    }
    
    // Store backup
    const backup = {
      userId: user.userId,
      backupName: backupName || `Backup ${new Date().toISOString()}`,
      backupType: backupType || 'full',
      backupData: backupData,
      size: JSON.stringify(backupData).length,
      createdAt: new Date(),
      deviceId: backupData.deviceInfo?.deviceId,
      appVersion: backupData.appVersion
    };
    
    const result = await db.collection('backups').insertOne(backup);
    
    return NextResponse.json({
      success: true,
      backupId: result.insertedId,
      message: 'Backup stored successfully'
    }, { headers: corsHeaders });
    
  } catch (error) {
    console.error('Backup API error:', error);
    return NextResponse.json({ error: 'Backup failed' }, { status: 500, headers: corsHeaders });
  }
}

// Get available backups
export async function GET(req: Request) {
  const corsHeaders = getCorsHeaders(req);
  
  try {
    const { searchParams } = new URL(req.url);
    const accessToken = searchParams.get('accessToken');
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing accessToken' }, { status: 400, headers: corsHeaders });
    }
    
    const client = await clientPromise;
    const db = client.db('AdminDB');
    
    // Verify access token
    const user = await db.collection('users').findOne({ accessToken });
    if (!user) {
      return NextResponse.json({ error: 'Invalid access token' }, { status: 401, headers: corsHeaders });
    }
    
    // Get user's backups
    const backups = await db.collection('backups')
      .find({ userId: user.userId })
      .sort({ createdAt: -1 })
      .project({
        _id: 1,
        backupName: 1,
        backupType: 1,
        size: 1,
        createdAt: 1,
        deviceId: 1,
        appVersion: 1
      })
      .toArray();
    
    return NextResponse.json({
      success: true,
      backups
    }, { headers: corsHeaders });
    
  } catch (error) {
    console.error('Backup list API error:', error);
    return NextResponse.json({ error: 'Failed to get backups' }, { status: 500, headers: corsHeaders });
  }
}

function getMaxBackupsForPlan(plan: string): number {
  switch (plan) {
    case 'monthly':
      return 10;
    case '6months':
      return 25;
    case 'yearly':
      return 50;
    default:
      return 5;
  }
}

export function OPTIONS(req: Request) {
  const corsHeaders = getCorsHeaders(req);
  return new Response(null, { status: 204, headers: corsHeaders });
}
