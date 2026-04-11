'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import NavBar from '../components/NavBar';
import { trackPageView } from '@/lib/googleAnalytics';

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Hide NavBar for all routes that start with /app/
  const shouldHideNav = pathname.startsWith('/app/');

  useEffect(() => {
    const query = searchParams.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    trackPageView(url);
  }, [pathname, searchParams]);

  return (
    <>
      {!shouldHideNav && <NavBar />}
      {children}
    </>
  );
}
