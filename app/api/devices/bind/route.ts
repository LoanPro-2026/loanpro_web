import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getCorsHeaders, handlePreflight } from '../cors';

export function OPTIONS(req: Request) {
  return handlePreflight(req); // ✅ Returns only a Response
}

export async function POST(req: Request) {
  const corsHeaders = getCorsHeaders(req); // ✅ Returns headers only

  try {
    const { accessToken, deviceId, deviceName } = await req.json();

    if (!accessToken) return NextResponse.json({ error: 'Missing accessToken' }, { status: 400, headers: corsHeaders });
    if (!deviceId) return NextResponse.json({ error: 'Missing deviceId' }, { status: 400, headers: corsHeaders });

    const client = await clientPromise;
    const db = client.db('AdminDB');
    const user = await db.collection('users').findOne({ accessToken });

    if (!user) return NextResponse.json({ error: 'Invalid access token' }, { status: 401, headers: corsHeaders });

    const existingDevice = (user.devices || []).find((d: any) => d.deviceId === deviceId && d.status === 'active');
    if (existingDevice) {
      return NextResponse.json({ success: true, message: 'Device already bound', device: existingDevice }, { headers: corsHeaders });
    }

    const deviceEntry = {
      deviceId,
      deviceName: deviceName || 'Unnamed Device',
      status: 'active',
      lastActive: new Date(),
    };

      if (!user) {
        await db.collection('users').insertOne({
          accessToken,
          devices: [deviceEntry],
          createdAt: new Date(),
        });
      } else {
        await db.collection('users').updateOne(
          { accessToken },
          { $push: { devices: deviceEntry } } as any
        );
      }

    return NextResponse.json({ success: true, message: 'Device bound successfully', device: deviceEntry }, { headers: corsHeaders });

  } catch (error) {
    console.error('Device bind API error:', error);
    return NextResponse.json({ error: 'Failed to bind device' }, { status: 500, headers: corsHeaders });
  }
}
