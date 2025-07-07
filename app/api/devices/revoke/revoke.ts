import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { handleCors } from '../cors/cors';

export async function OPTIONS(req: Request) {
  return handleCors(req);
}

export async function POST(req: Request) {
  const corsHeaders = await handleCors(req);
  if (corsHeaders instanceof Response) return corsHeaders;
  try {
    const { accessToken, deviceId } = await req.json();
    if (!accessToken) return NextResponse.json({ error: 'Missing accessToken' }, { status: 400, headers: corsHeaders });
    if (!deviceId) return NextResponse.json({ error: 'Missing deviceId' }, { status: 400, headers: corsHeaders });

    const client = await clientPromise;
    const db = client.db('AdminDB');

    // Find user by accessToken
    const user = await db.collection('users').findOne({ accessToken });
    if (!user) return NextResponse.json({ error: 'Invalid access token' }, { status: 401, headers: corsHeaders });

    // Set device status to revoked
    await db.collection('users').updateOne(
      { accessToken, 'devices.deviceId': deviceId },
      { $set: { 'devices.$.status': 'revoked' } } as any
    );

    return NextResponse.json({ success: true, message: 'Device revoked' }, { headers: corsHeaders });
  } catch (error) {
    console.error('Device revoke API error:', error);
    return NextResponse.json({ error: 'Failed to revoke device' }, { status: 500, headers: corsHeaders });
  }
} 