import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getCorsHeaders } from '@/lib/cors';
import { ObjectId } from 'mongodb';
import { logger } from '@/lib/logger';
import { enforceRequestRateLimit, parseJsonRequest, toSafeErrorResponse } from '@/lib/apiSafety';

// Restore specific backup
export async function POST(
  req: Request, 
  { params }: { params: Promise<{ backupId: string }> }
) {
  const corsHeaders = getCorsHeaders(req);
  const applyCors = (response: NextResponse) => {
    Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value));
    return response;
  };
  
  try {
    const rateLimitResponse = enforceRequestRateLimit({
      request: req,
      scope: 'backup-restore',
      limit: 25,
      windowMs: 60 * 1000,
    });
    if (rateLimitResponse) return applyCors(rateLimitResponse);

    const parsedBody = await parseJsonRequest<Record<string, unknown>>(req, { maxBytes: 32 * 1024 });
    if (!parsedBody.ok) return applyCors(parsedBody.response);

    const body = parsedBody.data as Record<string, any>;
    const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';
    const { backupId } = await params; // Await the params promise
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing accessToken' }, { status: 400, headers: corsHeaders });
    }
    
    if (!ObjectId.isValid(backupId)) {
      return NextResponse.json({ error: 'Invalid backup ID' }, { status: 400, headers: corsHeaders });
    }
    
    const client = await clientPromise;
    const db = client.db('AdminDB');
    
    // Verify access token
    const user = await db.collection('users').findOne({ accessToken });
    if (!user) {
      return NextResponse.json({ error: 'Invalid access token' }, { status: 401, headers: corsHeaders });
    }
    
    // Get the backup
    const backup = await db.collection('backups').findOne({
      _id: new ObjectId(backupId),
      userId: user.userId
    });
    
    if (!backup) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404, headers: corsHeaders });
    }
    
    // Update last accessed timestamp
    await db.collection('backups').updateOne(
      { _id: new ObjectId(backupId) },
      { $set: { lastAccessed: new Date() } }
    );
    
    return NextResponse.json({
      success: true,
      backup: {
        id: backup._id,
        name: backup.backupName,
        type: backup.backupType,
        data: backup.backupData,
        createdAt: backup.createdAt
      }
    }, { headers: corsHeaders });
    
  } catch (error) {
    logger.error('Restore API error', error, 'BACKUP_API');
    return applyCors(toSafeErrorResponse(error, 'BACKUP_API', 'Restore failed'));
  }
}

// Delete specific backup
export async function DELETE(
  req: Request, 
  { params }: { params: Promise<{ backupId: string }> }
) {
  const corsHeaders = getCorsHeaders(req);
  const applyCors = (response: NextResponse) => {
    Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value));
    return response;
  };
  
  try {
    const rateLimitResponse = enforceRequestRateLimit({
      request: req,
      scope: 'backup-delete',
      limit: 25,
      windowMs: 60 * 1000,
    });
    if (rateLimitResponse) return applyCors(rateLimitResponse);

    const { searchParams } = new URL(req.url);
    const queryToken = searchParams.get('accessToken')?.trim() || '';
    const headerToken = req.headers.get('x-desktop-access-token')?.trim() || '';
    const authHeader = req.headers.get('authorization') || '';
    const bearerToken = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
    const accessToken = queryToken || headerToken || bearerToken;
    const { backupId } = await params; // Await the params promise
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing accessToken' }, { status: 400, headers: corsHeaders });
    }
    
    if (!ObjectId.isValid(backupId)) {
      return NextResponse.json({ error: 'Invalid backup ID' }, { status: 400, headers: corsHeaders });
    }
    
    const client = await clientPromise;
    const db = client.db('AdminDB');
    
    // Verify access token
    const user = await db.collection('users').findOne({ accessToken });
    if (!user) {
      return NextResponse.json({ error: 'Invalid access token' }, { status: 401, headers: corsHeaders });
    }
    
    // Delete the backup
    const result = await db.collection('backups').deleteOne({
      _id: new ObjectId(backupId),
      userId: user.userId
    });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404, headers: corsHeaders });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Backup deleted successfully'
    }, { headers: corsHeaders });
    
  } catch (error) {
    logger.error('Delete backup API error', error, 'BACKUP_API');
    return applyCors(toSafeErrorResponse(error, 'BACKUP_API', 'Failed to delete backup'));
  }
}

export function OPTIONS(req: Request) {
  const corsHeaders = getCorsHeaders(req);
  return new Response(null, { status: 204, headers: corsHeaders });
}
