import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SubscriptionService } from "@/services/subscriptionService";
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import SubscriptionActions from '@/components/SubscriptionActions';
import GoToDashboardButton from '@/components/GoToDashboardButton';
import { Suspense } from 'react';
import Loader from '@/components/Loader';
import { getSubscriptionStatus } from '@/lib/subscriptionHelpers';

function getDaysLeft(endDate: Date) {
  const now = new Date();
  const end = new Date(endDate);
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

export default async function MySubscriptionPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const subscriptionService = new SubscriptionService();
  const subscription = await subscriptionService.getSubscriptionByUserId(userId);

  if (!subscription) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 max-w-lg w-full text-center">
          <h1 className="text-2xl font-semibold text-slate-900 mb-4">No active subscription</h1>
          <p className="text-slate-600 mb-6">You do not have an active subscription. Please choose a plan to get started.</p>
          <Link href="/subscribe" className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">Choose plan</Link>
        </div>
      </div>
    );
  }

  const daysLeft = getDaysLeft(subscription.endDate);
  const computedStatus = getSubscriptionStatus(subscription as any);
  const isActive = computedStatus === 'active_subscription' || computedStatus === 'active_trial';
  const isGracePeriod = computedStatus === 'grace_period';
  const isExpired = computedStatus === 'expired' || subscription.status === 'canceled';
  const statusLabel = isActive ? 'Active' : isGracePeriod ? 'Grace Period' : 'Inactive';
  const statusBadgeClass = isActive
    ? 'bg-green-100 text-green-700'
    : isGracePeriod
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-red-100 text-red-700';

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-semibold mb-8 text-center text-slate-900 font-display">My subscription</h1>
        <div className="bg-white rounded-2xl shadow-sm p-8 flex flex-col gap-8 items-center border border-slate-200">
          <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <div className="text-xl font-semibold text-slate-900 mb-1 uppercase">{subscription.subscriptionType}</div>
              <div className="text-slate-500">{subscription.username}</div>
            </div>
            <div className={`flex items-center gap-2 px-4 py-1 rounded-full text-sm font-semibold ${statusBadgeClass}`}>
              {isActive ? <CheckCircleIcon className="w-4 h-4" /> : <XCircleIcon className="w-4 h-4" />}
              {statusLabel}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
            <div className="bg-slate-50 rounded-xl p-6 flex flex-col items-center border border-slate-200">
              <span className="text-slate-600">Start date</span>
              <span className="text-slate-900 font-semibold text-lg">{new Date(subscription.startDate).toLocaleDateString()}</span>
            </div>
            <div className="bg-slate-50 rounded-xl p-6 flex flex-col items-center border border-slate-200">
              <span className="text-slate-600">End date</span>
              <span className="text-slate-900 font-semibold text-lg">{new Date(subscription.endDate).toLocaleDateString()}</span>
            </div>
            <div className="bg-slate-50 rounded-xl p-6 flex flex-col items-center border border-slate-200">
              <span className="text-slate-600">Days left</span>
              <span className="text-slate-900 font-semibold text-lg">{daysLeft}</span>
            </div>
            <div className="bg-slate-50 rounded-xl p-6 flex flex-col items-center border border-slate-200">
              <span className="text-slate-600">Renewal</span>
              <span className="text-slate-900 font-semibold text-lg">
                {isActive ? 'Auto-renewal enabled' : isGracePeriod ? 'Grace period active' : 'Expired'}
              </span>
            </div>
          </div>
          <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-4 mt-4">
            <div className="text-slate-500 text-sm">Payment ID: <span className="font-mono">{subscription.paymentId}</span></div>
            {subscription.receiptUrl && (
              <a href={subscription.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm font-semibold">View receipt</a>
            )}
          </div>
          {isActive && (
            <Suspense fallback={<Loader message="Loading dashboard link..." />}>
              <GoToDashboardButton />
            </Suspense>
          )}
          <SubscriptionActions
            isActive={isActive}
            isExpired={isExpired}
            receiptUrl={subscription.receiptUrl}
            paymentId={subscription.paymentId}
            subscriptionType={subscription.subscriptionType}
          />
        </div>
      </div>
    </div>
  );
} 