// app/api/devices/request-switch/route.ts

import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getCorsHeaders, handlePreflight } from '../cors';

export function OPTIONS(req: Request) {
  return handlePreflight(req);
}

export async function POST(req: Request) {
  const corsHeaders = getCorsHeaders(req);

  try {
    const { accessToken, deviceId, deviceName } = await req.json();

    if (!accessToken)
      return NextResponse.json({ error: 'Missing accessToken' }, { status: 400, headers: corsHeaders });

    if (!deviceId)
      return NextResponse.json({ error: 'Missing deviceId' }, { status: 400, headers: corsHeaders });

    const client = await clientPromise;
    const db = client.db('AdminDB');

    const user = await db.collection('users').findOne({ accessToken });
    if (!user)
      return NextResponse.json({ error: 'Invalid access token' }, { status: 401, headers: corsHeaders });

    const deviceEntry = {
      deviceId,
      deviceName: deviceName || 'Unnamed Device',
      status: 'pending',
      lastActive: new Date(),
    };

    await db.collection('users').updateOne(
      { accessToken },
      { $push: { devices: deviceEntry } } as any
    );

    return NextResponse.json({ success: true, message: 'Device switch requested', device: deviceEntry }, { headers: corsHeaders });

  } catch (error) {
    console.error('Device switch request API error:', error);
    return NextResponse.json({ error: 'Failed to request device switch' }, { status: 500, headers: corsHeaders });
  }
}
