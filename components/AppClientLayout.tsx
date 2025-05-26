'use client';
import { TenantProvider } from './TenantProvider';
import NavBar from './NavBar';
import GlobalLoader from '@/components/GlobalLoader';
import ToastProvider from '@/components/ToastProvider';

export default function AppClientLayout({ tenant, children }: { tenant: string | null, children: React.ReactNode }) {
  return (
    <ToastProvider>
      <GlobalLoader />
      <TenantProvider tenant={tenant}>
        <NavBar />
        <main>{children}</main>
      </TenantProvider>
    </ToastProvider>
  );
} 