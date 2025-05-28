import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import ToastProvider from '@/components/ToastProvider';
import GlobalLoader from '@/components/GlobalLoader';
import { TenantProvider } from '../components/TenantProvider';
import AppWrapper from './AppWrapper';
import { headers } from 'next/headers';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const tenant = headersList.get('x-tenant');

  return (
    <ClerkProvider>
      <html lang="en">
        <body className="bg-white text-gray-900">
          <ToastProvider>
            <GlobalLoader />
            <TenantProvider tenant={tenant}>
              <AppWrapper>{children}</AppWrapper>
            </TenantProvider>
          </ToastProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
