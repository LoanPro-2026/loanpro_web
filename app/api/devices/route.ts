import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
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