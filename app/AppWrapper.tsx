'use client';

import { usePathname } from 'next/navigation';
import NavBar from '../components/NavBar';

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Hide NavBar for all routes that start with /app/
  const shouldHideNav = pathname.startsWith('/app/');

  return (
    <>
      {!shouldHideNav && <NavBar />}
      {children}
    </>
  );
}
