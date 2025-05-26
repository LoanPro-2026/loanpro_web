'use client';
import { useTenant } from './TenantProvider';

export default function GoToDashboardButton() {
  const { tenant } = useTenant();
  let dashboardUrl = '/';
  if (tenant) {
    dashboardUrl = `https://${tenant}.loanpro.tech/app/dashboard`;
  } else if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    dashboardUrl = '/app/dashboard';
  }
  return (
    <a
      href={dashboardUrl}
      className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition mt-4"
    >
      Go to Dashboard
    </a>
  );
} 