import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import ToastProvider from '@/components/ToastProvider';
import GlobalLoader from '@/components/GlobalLoader';
import { TenantProvider } from '../components/TenantProvider';
import { headers } from 'next/headers';
import NavBar from '../components/NavBar';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const tenant = headersList.get('x-tenant');
  const isAppRoute = typeof headersList.get === 'function' && headersList.get('x-nextjs-pathname')?.startsWith('/app/app');

  return (
    <ClerkProvider>
      <html lang="en">
        <body className="bg-white text-gray-900">
            <ToastProvider>
              <GlobalLoader />
              <TenantProvider tenant={tenant}>
                {/* Only show NavBar for non-app routes */}
                {!isAppRoute && <NavBar />}
                <main>{children}</main>
              </TenantProvider>
            </ToastProvider>
        </body>
      </html>
    </ClerkProvider>
  );
<<<<<<< HEAD
} 
=======
} 
>>>>>>> bf4952c084c624fdc7fed85428769f806a8d323e
