import { connectToDatabase } from '@/lib/mongodb';
import { enforceAdminAccess, getAdminErrorStatus } from '@/lib/adminAuth';
import { getAdminCachedResponse, setAdminCachedResponse } from '@/lib/adminResponseCache';

const SUCCESS_STATUS_REGEX = /^(completed|captured|success|paid)$/i;

export async function GET(request: Request) {
  try {
    await enforceAdminAccess(request, {
      permission: 'dashboard:read',
      rateLimitKey: 'metrics:get',
      limit: 80,
      windowMs: 60_000,
    });

    const cacheKey = 'admin:metrics:v1';
    const cached = getAdminCachedResponse<any>(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), { status: 200 });
    }

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
      status: { $regex: SUCCESS_STATUS_REGEX }
    }).toArray();

    // Admin-created subscriptions may not create payment rows; include them to keep dashboard totals aligned.
    const adminCreatedSubscriptions = await db.collection('subscriptions').find({
      source: 'admin_panel',
      paymentId: null,
      amount: { $gt: 0 }
    }).toArray();

    // Amounts in payments collection are stored in rupees.
    const paymentRevenue = payments.reduce((sum, p) => {
      const amount = Number(p.amount || 0);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);
    const manualSubscriptionRevenue = adminCreatedSubscriptions.reduce((sum, s) => {
      const amount = Number(s.amount || 0);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);
    const totalRevenue = paymentRevenue + manualSubscriptionRevenue;

    // Get this month's revenue
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthlyPayments = payments.filter(p => {
      const paymentDate = p.createdAt ? new Date(p.createdAt) : null;
      return paymentDate && paymentDate >= monthStart;
    });
    
    const paymentMonthlyRevenue = monthlyPayments.reduce((sum, p) => {
      const amount = Number(p.amount || 0);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);
    const monthlyAdminSubscriptionRevenue = adminCreatedSubscriptions.reduce((sum, s) => {
      const created = s.createdAt ? new Date(s.createdAt) : null;
      if (!created || created < monthStart) return sum;
      const amount = Number(s.amount || 0);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);
    const monthlyRevenue = paymentMonthlyRevenue + monthlyAdminSubscriptionRevenue;

    // Get active users this month
    const monthlyUsers = await db.collection('users').countDocuments({
      lastLogin: { $gte: monthStart }
    });

    // Calculate averages
    const avgSubscriptionValue = activeSubscriptions > 0 ? monthlyRevenue / activeSubscriptions : 0;

    const payload = {
      totalUsers,
      activeSubscriptions,
      totalRevenue,
      monthlyRevenue,
      revenueGrowth: 12,
      trialUsers,
      expiredSubscriptions,
      activeUsersThisMonth: monthlyUsers,
      avgSubscriptionValue: Math.round(avgSubscriptionValue)
    };

    setAdminCachedResponse(cacheKey, payload, 20_000, ['dashboard', 'metrics', 'payments', 'subscriptions', 'users']);

    return new Response(JSON.stringify(payload), { status: 200 });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch metrics' }), { status: getAdminErrorStatus(error) });
  }
}
