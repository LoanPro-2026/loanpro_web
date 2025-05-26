import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SubscriptionService } from "@/services/subscriptionService";
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import SubscriptionActions from '@/components/SubscriptionActions';
import GoToDashboardButton from '@/components/GoToDashboardButton';
import { Suspense } from 'react';
import Loader from '@/components/Loader';

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
      <div className="min-h-screen bg-gray-50 p-8 flex flex-col items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center">
          <h1 className="text-3xl font-bold mb-4">No Active Subscription</h1>
          <p className="mb-6">You do not have an active subscription. Please choose a plan to get started.</p>
          <Link href="/subscribe" className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">Choose Plan</Link>
        </div>
      </div>
    );
  }

  const daysLeft = getDaysLeft(subscription.endDate);
  const isActive = subscription.status === 'active' && daysLeft > 0;
  const isExpired = daysLeft === 0 || subscription.status === 'canceled';

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-blue-200 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-extrabold mb-10 text-center text-blue-900 drop-shadow">My Subscription</h1>
        <div className="bg-white rounded-3xl shadow-2xl p-10 flex flex-col gap-8 items-center border border-blue-100">
          <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <div className="text-2xl font-bold text-blue-700 mb-1 tracking-wide uppercase">{subscription.subscriptionType}</div>
              <div className="text-gray-500">{subscription.username}</div>
            </div>
            <div className={`flex items-center gap-2 px-4 py-1 rounded-full text-base font-semibold ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{isActive ? <CheckCircleIcon className="w-5 h-5" /> : <XCircleIcon className="w-5 h-5" />}{isActive ? 'Active' : 'Inactive'}</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
            <div className="bg-blue-50 rounded-xl p-6 flex flex-col items-center">
              <span className="text-gray-700">Start Date</span>
              <span className="text-gray-800 font-bold text-lg">{new Date(subscription.startDate).toLocaleDateString()}</span>
            </div>
            <div className="bg-blue-50 rounded-xl p-6 flex flex-col items-center">
              <span className="text-gray-700">End Date</span>
              <span className="text-gray-800 font-bold text-lg">{new Date(subscription.endDate).toLocaleDateString()}</span>
            </div>
            <div className="bg-blue-50 rounded-xl p-6 flex flex-col items-center">
              <span className="text-gray-700">Days Left</span>
              <span className="text-gray-800 font-bold text-lg">{daysLeft}</span>
            </div>
            <div className="bg-blue-50 rounded-xl p-6 flex flex-col items-center">
              <span className="text-gray-700">Renewal</span>
              <span className="text-gray-800 font-bold text-lg">{isActive ? 'Auto-renewal enabled' : 'Expired'}</span>
            </div>
          </div>
          <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-4 mt-4">
            <div className="text-gray-500 text-sm">Payment ID: <span className="font-mono">{subscription.paymentId}</span></div>
            {subscription.receiptUrl && (
              <a href={subscription.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm font-semibold">View Receipt</a>
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