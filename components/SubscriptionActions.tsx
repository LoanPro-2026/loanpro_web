"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { useToast } from '@/components/ToastProvider';
import ProgressBar from '@/components/ProgressBar';

export default function SubscriptionActions({
  isActive,
  isExpired,
  receiptUrl,
  paymentId,
  subscriptionType,
}: {
  isActive: boolean;
  isExpired: boolean;
  receiptUrl?: string;
  paymentId: string;
  subscriptionType: string;
}) {
  const [status, setStatus] = useState(isActive ? "active" : isExpired ? "expired" : "inactive");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const { showToast } = useToast();

  async function handleCancel(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/cancel-subscription", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setStatus("canceled");
        setMessage("Subscription canceled successfully.");
        setShowModal(false);
        showToast('Subscription cancelled successfully!', 'success');
      } else {
        setMessage(data.error || "Failed to cancel subscription.");
      }
    } catch (err) {
      setMessage("Error canceling subscription.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-4 justify-center mt-6 w-full">
      <ProgressBar show={loading} />
      {message && (
        <div className="w-full text-center text-sm font-semibold text-blue-700 bg-blue-50 rounded-lg p-2 mb-2">{message}</div>
      )}
      {status === "expired" || status === "canceled" ? (
        <Link href="/subscribe" className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"><ArrowPathIcon className="w-5 h-5" />Renew</Link>
      ) : null}
      <Link href="/subscribe" className="flex items-center gap-2 px-6 py-2 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition">Change Plan</Link>
      {status === "active" && (
        <>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition"
          >
            Cancel Plan
          </button>
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full relative z-50">
                <h2 className="text-xl font-bold mb-4 text-red-600">Cancel Subscription</h2>
                <p className="mb-3 text-gray-700">Are you sure you want to cancel your subscription? Your premium access will be removed according to your plan policy.</p>
                <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 rounded">
                  <strong>Important:</strong> Before cancellation, ensure your required records and backups are safely retained according to your internal policy.
                </div>
                <div className="flex gap-4 justify-end mt-6">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition"
                  >
                    Go Back
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="px-4 py-2 rounded bg-red-600 text-white font-semibold hover:bg-red-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? "Canceling..." : "Cancel Subscription"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
} 