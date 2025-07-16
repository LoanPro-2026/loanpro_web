import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getCorsHeaders, handlePreflight } from './cors';

export function OPTIONS(req: Request) {
  return handlePreflight(req);
}

// Clerk-authenticated device listing (for web dashboard)
export async function GET(req: Request) {
  try {
    // Dynamically import Clerk auth to avoid breaking API for Electron
    const { auth } = await import('@clerk/nextjs/server');
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const client = await clientPromise;
    const db = client.db('AdminDB');
    const user = await db.collection('users').findOne({ userId });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ devices: user.devices || [] });
  } catch (error) {
    console.error('Device list API error:', error);
    return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 });
  }
}

// Electron app: POST with accessToken
export async function POST(req: Request) {
  const corsHeaders = getCorsHeaders(req);
  try {
    const { accessToken } = await req.json();
    if (!accessToken) return NextResponse.json({ error: 'Missing accessToken' }, { status: 400, headers: corsHeaders });
    const client = await clientPromise;
    const db = client.db('AdminDB');
    const user = await db.collection('users').findOne({ accessToken });
    if (!user) return NextResponse.json({ error: 'Invalid access token' }, { status: 401, headers: corsHeaders });
    return NextResponse.json({ devices: user.devices || [] }, { headers: corsHeaders });
  } catch (error) {
    console.error('Device list API error:', error);
    return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500, headers: corsHeaders });
  }
} 