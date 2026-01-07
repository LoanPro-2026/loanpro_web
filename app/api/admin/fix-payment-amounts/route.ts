import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import clientPromise from '@/lib/mongodb';

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

export async function POST(request: Request) {
  try {
    await verifyAdmin();

    const client = await clientPromise;
    const db = client.db('AdminDB');

    // Find all payments with amount 0
    const paymentsWithZeroAmount = await db.collection('payments').find({
      amount: 0
    }).toArray();

    let updated = 0;
    let skipped = 0;

    for (const payment of paymentsWithZeroAmount) {
      // Find the corresponding order intent
      const orderIntent = await db.collection('order_intents').findOne({
        orderId: payment.orderId
      });

      if (orderIntent && orderIntent.amount) {
        // Update the payment with the correct amount
        await db.collection('payments').updateOne(
          { _id: payment._id },
          { $set: { amount: orderIntent.amount } }
        );
        updated++;
      } else {
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updated} payments, skipped ${skipped}`,
      totalFound: paymentsWithZeroAmount.length,
      updated,
      skipped
    });
  } catch (error) {
    console.error('Error fixing payment amounts:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fix payment amounts' },
      { status: 500 }
    );
  }
}
