import React from 'react';
import { CheckCircleIcon, ExclamationCircleIcon, ClockIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface StatusBadgeProps {
  status: 'active' | 'expired' | 'trial' | 'cancelled' | 'pending' | 'inactive';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'outline' | 'soft';
  icon?: boolean;
}

export default function StatusBadge({ 
  status, 
  size = 'md',
  variant = 'solid',
  icon = true 
}: StatusBadgeProps) {
  const configs = {
    active: {
      label: 'Active',
      icon: CheckCircleIcon,
      colors: {
        solid: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
        outline: 'border-2 border-green-500 text-green-700 bg-white',
        soft: 'bg-green-100 text-green-800 border border-green-200'
      }
    },
    trial: {
      label: 'Trial',
      icon: SparklesIcon,
      colors: {
        solid: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white',
        outline: 'border-2 border-blue-500 text-blue-700 bg-white',
        soft: 'bg-blue-100 text-blue-800 border border-blue-200'
      }
    },
    expired: {
      label: 'Expired',
      icon: ExclamationCircleIcon,
      colors: {
        solid: 'bg-gradient-to-r from-red-500 to-rose-500 text-white',
        outline: 'border-2 border-red-500 text-red-700 bg-white',
        soft: 'bg-red-100 text-red-800 border border-red-200'
      }
    },
    pending: {
      label: 'Pending',
      icon: ClockIcon,
      colors: {
        solid: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
        outline: 'border-2 border-amber-500 text-amber-700 bg-white',
        soft: 'bg-amber-100 text-amber-800 border border-amber-200'
      }
    },
    cancelled: {
      label: 'Cancelled',
      icon: ExclamationCircleIcon,
      colors: {
        solid: 'bg-gradient-to-r from-gray-500 to-slate-500 text-white',
        outline: 'border-2 border-gray-500 text-gray-700 bg-white',
        soft: 'bg-gray-100 text-gray-800 border border-gray-200'
      }
    },
    inactive: {
      label: 'Inactive',
      icon: ExclamationCircleIcon,
      colors: {
        solid: 'bg-gradient-to-r from-slate-500 to-zinc-500 text-white',
        outline: 'border-2 border-slate-500 text-slate-700 bg-white',
        soft: 'bg-slate-100 text-slate-800 border border-slate-200'
      }
    }
  };

  const config = configs[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3.5 py-2 text-sm',
    lg: 'px-4 py-2.5 text-base'
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold transition-all ${
        config.colors[variant]
      } ${sizeClasses[size]} whitespace-nowrap`}
    >
      {icon && <Icon className={iconSizes[size]} />}
      <span>{config.label}</span>
    </div>
  );
}
