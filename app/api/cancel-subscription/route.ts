import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import mysql from 'mysql2/promise';

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db('AdminDB');
    const subscription = await db.collection('subscriptions').findOne({ userId });
    if (!subscription) return NextResponse.json({ error: 'No subscription found' }, { status: 404 });

    // Remove subscription and user
    await db.collection('subscriptions').deleteOne({ userId });
    await db.collection('users').deleteOne({ userId });

    // Drop user's MySQL database (named after username)
    const dbName = `loan_${subscription.username.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    console.log('Dropping database:', dbName);
    const pool = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT) : 3306,
      multipleStatements: true
    });
    await pool.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await pool.end();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
  }
} 