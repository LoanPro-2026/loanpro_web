import React, { useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function Toast({ message, type = 'info', onClose }: { message: string; type?: 'success' | 'error' | 'info' | 'warning'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getStyles = () => {
    switch(type) {
      case 'success':
        return {
          bg: 'bg-gradient-to-r from-green-500 to-emerald-500',
          border: 'border-green-400/30',
          icon: CheckCircleIcon,
          dot: 'bg-green-400'
        };
      case 'error':
        return {
          bg: 'bg-gradient-to-r from-red-500 to-rose-500',
          border: 'border-red-400/30',
          icon: XCircleIcon,
          dot: 'bg-red-400'
        };
      case 'warning':
        return {
          bg: 'bg-gradient-to-r from-amber-500 to-orange-500',
          border: 'border-amber-400/30',
          icon: ExclamationTriangleIcon,
          dot: 'bg-amber-400'
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-blue-500 to-cyan-500',
          border: 'border-blue-400/30',
          icon: InformationCircleIcon,
          dot: 'bg-blue-400'
        };
    }
  };

  const styles = getStyles();
  const Icon = styles.icon;

  return (
    <div 
      className={`fixed top-6 right-6 z-50 ${styles.bg} border ${styles.border} backdrop-blur-lg rounded-2xl shadow-2xl text-white font-semibold flex items-center gap-4 px-6 py-4 animate-slide-in hover:shadow-3xl transition-shadow cursor-pointer`}
      style={{ minWidth: 320, maxWidth: 400 }}
      onClick={onClose}
    >
      <div className="flex-shrink-0">
        <div className={`w-10 h-10 rounded-full ${styles.dot}/20 flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <span className="flex-1 text-sm leading-relaxed">{message}</span>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }} 
        className="ml-2 text-white/70 hover:text-white transition-colors flex-shrink-0"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <style jsx>{`
        .animate-slide-in {
          animation: slide-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes slide-in {
          from { 
            opacity: 0; 
            transform: translateX(400px) scale(0.9);
          }
          to { 
            opacity: 1; 
            transform: translateX(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
} 