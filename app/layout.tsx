import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import ToastProvider from '@/components/ToastProvider';
import GlobalLoader from '@/components/GlobalLoader';
import { TenantProvider } from '../components/TenantProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import AppWrapper from './AppWrapper';
import { headers } from 'next/headers';
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "LoanPro - Professional Loan Management Application",
  description: "A comprehensive loan management application for professionals with advanced features and secure authentication.",
  keywords: "loan management, finance, application",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const tenant = headersList.get('x-tenant');

  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          {/* Prevent MIME type sniffing */}
          <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        </head>
        <body className={inter.className}>
          <ErrorBoundary>
            <ToastProvider>
              <GlobalLoader />
              <TenantProvider tenant={tenant}>
                <AppWrapper>{children}</AppWrapper>
              </TenantProvider>
            </ToastProvider>
          </ErrorBoundary>
          {/* Global jQuery Load */}
          <script id="jquery-sdk" src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js" async={false}></script>
        </body>
      </html>
    </ClerkProvider>
  );
}
