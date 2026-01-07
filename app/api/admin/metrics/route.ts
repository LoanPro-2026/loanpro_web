import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';

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

export async function GET(request: Request) {
  try {
    await verifyAdmin();

    const { db } = await connectToDatabase();

    // Get basic metrics
    const totalUsers = await db.collection('users').countDocuments();
    const activeSubscriptions = await db.collection('subscriptions').countDocuments({
      status: 'active'
    });
    const trialUsers = await db.collection('subscriptions').countDocuments({
      status: 'trial'
    });
    const expiredSubscriptions = await db.collection('subscriptions').countDocuments({
      status: 'expired'
    });

    // Get revenue data from payments
    const payments = await db.collection('payments').find({
      status: { $in: ['completed', 'captured', 'success'] }
    }).toArray();

    // Convert amounts from paise to rupees (Razorpay stores in paise)
    const totalRevenue = payments.reduce((sum, p) => {
      const amount = p.amount || 0;
      // If amount is in paise (> 1000), convert to rupees
      return sum + (amount > 1000 ? amount / 100 : amount);
    }, 0);

    // Get this month's revenue
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthlyPayments = payments.filter(p => {
      const paymentDate = p.createdAt ? new Date(p.createdAt) : null;
      return paymentDate && paymentDate >= monthStart;
    });
    
    const monthlyRevenue = monthlyPayments.reduce((sum, p) => {
      const amount = p.amount || 0;
      return sum + (amount > 1000 ? amount / 100 : amount);
    }, 0);

    // Get active users this month
    const monthlyUsers = await db.collection('users').countDocuments({
      lastLogin: { $gte: monthStart }
    });

    // Calculate averages
    const avgSubscriptionValue = activeSubscriptions > 0 ? monthlyRevenue / activeSubscriptions : 0;

    return new Response(JSON.stringify({
      totalUsers,
      activeSubscriptions,
      totalRevenue,
      monthlyRevenue,
      revenueGrowth: 12,
      trialUsers,
      expiredSubscriptions,
      activeUsersThisMonth: monthlyUsers,
      avgSubscriptionValue: Math.round(avgSubscriptionValue)
    }), { status: 200 });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch metrics' }), { status: 500 });
  }
}
