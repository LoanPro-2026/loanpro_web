import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getCorsHeaders } from '@/lib/cors';
import { getSubscriptionStatus } from '@/lib/subscriptionHelpers';
import { logger } from '@/lib/logger';
import { enforceRequestRateLimit, parseJsonRequest, toSafeErrorResponse } from '@/lib/apiSafety';

// Cloud backup endpoint for desktop app
export async function POST(req: Request) {
  const corsHeaders = getCorsHeaders(req);
  const applyCors = (response: NextResponse) => {
    Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value));
    return response;
  };
  
  try {
    const rateLimitResponse = enforceRequestRateLimit({
      request: req,
      scope: 'backup-store',
      limit: 30,
      windowMs: 60 * 1000,
    });
    if (rateLimitResponse) return applyCors(rateLimitResponse);

    const parsedBody = await parseJsonRequest<Record<string, unknown>>(req, { maxBytes: 2 * 1024 * 1024 });
    if (!parsedBody.ok) return applyCors(parsedBody.response);

    const body = parsedBody.data as Record<string, any>;
    const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';
    const backupData = body.backupData;
    const backupType = typeof body.backupType === 'string' ? body.backupType.trim() : undefined;
    const backupName = typeof body.backupName === 'string' ? body.backupName.trim() : undefined;
    
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
    const accessStatus = subscription ? getSubscriptionStatus(subscription as any) : 'expired';
    if (!subscription || accessStatus === 'expired') {
      return NextResponse.json({ error: 'No active subscription' }, { status: 403, headers: corsHeaders });
    }
    
    // Get current backup count
    const backupCount = await db.collection('backups').countDocuments({ userId: user.userId });
    const maxBackups = getMaxBackupsForPlan(subscription.subscriptionType || subscription.plan || subscription.subscriptionPlan || 'monthly');
    
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
    logger.error('Backup API error', error, 'BACKUP_API');
    return applyCors(toSafeErrorResponse(error, 'BACKUP_API', 'Backup failed'));
  }
}

// Get available backups
export async function GET(req: Request) {
  const corsHeaders = getCorsHeaders(req);
  const applyCors = (response: NextResponse) => {
    Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value));
    return response;
  };
  
  try {
    const rateLimitResponse = enforceRequestRateLimit({
      request: req,
      scope: 'backup-list',
      limit: 60,
      windowMs: 60 * 1000,
    });
    if (rateLimitResponse) return applyCors(rateLimitResponse);

    const { searchParams } = new URL(req.url);
    const queryToken = searchParams.get('accessToken')?.trim() || '';
    const headerToken = req.headers.get('x-desktop-access-token')?.trim() || '';
    const authHeader = req.headers.get('authorization') || '';
    const bearerToken = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
    const accessToken = queryToken || headerToken || bearerToken;
    
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
    logger.error('Backup list API error', error, 'BACKUP_API');
    return applyCors(toSafeErrorResponse(error, 'BACKUP_API', 'Failed to get backups'));
  }
}

function getMaxBackupsForPlan(plan: string): number {
  switch (String(plan || '').toLowerCase()) {
    case 'monthly':
      return 10;
    case '6months':
      return 25;
    case 'yearly':
      return 50;
    case 'trial':
      return 25;
    default:
      return 5;
  }
}

export function OPTIONS(req: Request) {
  const corsHeaders = getCorsHeaders(req);
  return new Response(null, { status: 204, headers: corsHeaders });
}
