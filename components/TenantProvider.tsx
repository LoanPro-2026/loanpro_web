'use client';
import React, { createContext, useContext } from 'react';

interface TenantContextValue {
  tenant: string | null;
}

const TenantContext = createContext<TenantContextValue>({ tenant: null });

export function TenantProvider({ tenant, children }: { tenant: string | null, children: React.ReactNode }) {
  return (
    <TenantContext.Provider value={{ tenant }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
} 