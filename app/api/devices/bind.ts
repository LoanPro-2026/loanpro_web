import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { handleCors } from './cors';

export async function OPTIONS(req: Request) {
  return handleCors(req);
}

export async function POST(req: Request) {
  const corsHeaders = await handleCors(req);
  if (corsHeaders instanceof Response) return corsHeaders;
  try {
    const { accessToken, deviceId, deviceName } = await req.json();
    if (!accessToken) return NextResponse.json({ error: 'Missing accessToken' }, { status: 400, headers: corsHeaders });
    if (!deviceId) return NextResponse.json({ error: 'Missing deviceId' }, { status: 400, headers: corsHeaders });

    const client = await clientPromise;
    const db = client.db('AdminDB');

    // Find user by accessToken
    const user = await db.collection('users').findOne({ accessToken });
    if (!user) return NextResponse.json({ error: 'Invalid access token' }, { status: 401, headers: corsHeaders });

    const existingDevice = (user.devices || []).find((d: any) => d.deviceId === deviceId && d.status === 'active');
    if (existingDevice) {
      return NextResponse.json({ success: true, message: 'Device already bound', device: existingDevice }, { headers: corsHeaders });
    }

    // Add device to devices array
    const deviceEntry = {
      deviceId,
      deviceName: deviceName || 'Unnamed Device',
      status: 'active',
      lastActive: new Date(),
    };
    await db.collection('users').updateOne(
      { accessToken },
      {
        $push: { devices: deviceEntry },
        $setOnInsert: { devices: [] }
      } as any
    );

    return NextResponse.json({ success: true, message: 'Device bound successfully', device: deviceEntry }, { headers: corsHeaders });
  } catch (error) {
    console.error('Device bind API error:', error);
    return NextResponse.json({ error: 'Failed to bind device' }, { status: 500, headers: corsHeaders });
  }
} 