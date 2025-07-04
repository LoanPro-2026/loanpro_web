import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import ToastProvider from '@/components/ToastProvider';
import GlobalLoader from '@/components/GlobalLoader';
import { TenantProvider } from '../components/TenantProvider';
import AppWrapper from './AppWrapper';
import { headers } from 'next/headers';
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LoanPro App",
  description: "A comprehensive loan management application.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const tenant = headersList.get('x-tenant');

  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <ToastProvider>
            <GlobalLoader />
            <TenantProvider tenant={tenant}>
              <AppWrapper>{children}</AppWrapper>
            </TenantProvider>
          </ToastProvider>
          {/* Global jQuery Load */}
          <script id="jquery-sdk" src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js" async={false}></script>
        </body>
      </html>
    </ClerkProvider>
  );
}
