'use client';
import { useTenant } from './TenantProvider';

export default function TenantDemo() {
  const { tenant } = useTenant();
  if (!tenant) return null;
  return (
    <div className="mb-4 p-2 bg-blue-50 rounded text-blue-700 text-sm">
      <strong>Tenant (subdomain):</strong> {tenant}
    </div>
  );
} 