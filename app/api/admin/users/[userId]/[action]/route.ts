import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'your-admin-email@gmail.com';

async function verifyAdmin() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error('Unauthorized');
  }

  const userResponse = await fetch(
    `https://api.clerk.com/v1/users/${userId}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      },
    }
  );

  const user = await userResponse.json();
  const userEmail = user.email_addresses[0]?.email_address;

  if (userEmail !== ADMIN_EMAIL) {
    throw new Error('Access denied');
  }

  return userEmail;
}

export async function POST(
  request: Request,
  { params }: { params: { userId: string; action: string } }
) {
  try {
    await verifyAdmin();

    const { userId, action } = params;
    const { db } = await connectToDatabase();

    if (!ObjectId.isValid(userId)) {
      return new Response(JSON.stringify({ error: 'Invalid user ID' }), { status: 400 });
    }

    if (action === 'ban') {
      await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        { $set: { banned: true, bannedAt: new Date() } }
      );
      return new Response(JSON.stringify({ success: true, message: 'User banned' }), { status: 200 });
    } else if (action === 'unban') {
      await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        { $set: { banned: false, unbannedAt: new Date() } }
      );
      return new Response(JSON.stringify({ success: true, message: 'User unbanned' }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
  } catch (error) {
    console.error('Error updating user:', error);
    return new Response(JSON.stringify({ error: 'Failed to update user' }), { status: 500 });
  }
}
