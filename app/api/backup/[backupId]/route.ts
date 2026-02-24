import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getCorsHeaders } from '@/lib/cors';
import { ObjectId } from 'mongodb';

// Restore specific backup
export async function POST(
  req: Request, 
  { params }: { params: Promise<{ backupId: string }> }
) {
  const corsHeaders = getCorsHeaders(req);
  
  try {
    const { accessToken } = await req.json();
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
    console.error('Restore API error:', error);
    return NextResponse.json({ error: 'Restore failed' }, { status: 500, headers: corsHeaders });
  }
}

// Delete specific backup
export async function DELETE(
  req: Request, 
  { params }: { params: Promise<{ backupId: string }> }
) {
  const corsHeaders = getCorsHeaders(req);
  
  try {
    const { searchParams } = new URL(req.url);
    const accessToken = searchParams.get('accessToken');
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
    console.error('Delete backup API error:', error);
    return NextResponse.json({ error: 'Failed to delete backup' }, { status: 500, headers: corsHeaders });
  }
}

export function OPTIONS(req: Request) {
  const corsHeaders = getCorsHeaders(req);
  return new Response(null, { status: 204, headers: corsHeaders });
}
