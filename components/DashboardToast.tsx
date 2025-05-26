'use client';
import { useEffect } from 'react';
import { useToast } from '@/components/ToastProvider';

export default function DashboardToast() {
  const { showToast } = useToast();
  useEffect(() => {
    if (localStorage.getItem('justSignedUp')) {
      showToast('Account created successfully!', 'success');
      localStorage.removeItem('justSignedUp');
    }
  }, [showToast]);
  return null;
} 