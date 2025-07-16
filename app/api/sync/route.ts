import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getCorsHeaders } from '../devices/cors';

// Real-time data sync endpoint for desktop app
export async function POST(req: Request) {
  const corsHeaders = getCorsHeaders(req);
  
  try {
    const { accessToken, syncData, lastSyncTimestamp } = await req.json();
    
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
    
    const currentTimestamp = new Date();
    
    // Store sync data in user's sync collection
    await db.collection('userSyncData').updateOne(
      { userId: user.userId },
      {
        $set: {
          syncData,
          lastSyncTimestamp: currentTimestamp,
          deviceLastActive: currentTimestamp
        }
      },
      { upsert: true }
    );
    
    // Get any server-side changes since last sync
    const serverChanges = await db.collection('userSyncData').findOne(
      { 
        userId: user.userId,
        lastServerUpdate: { $gt: new Date(lastSyncTimestamp || 0) }
      }
    );
    
    return NextResponse.json({
      success: true,
      serverChanges: serverChanges?.serverData || null,
      serverTimestamp: currentTimestamp.toISOString()
    }, { headers: corsHeaders });
    
  } catch (error) {
    console.error('Sync API error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500, headers: corsHeaders });
  }
}

export function OPTIONS(req: Request) {
  const corsHeaders = getCorsHeaders(req);
  return new Response(null, { status: 204, headers: corsHeaders });
}
