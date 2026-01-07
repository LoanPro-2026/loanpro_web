import React from 'react';

interface LoadingSkeletonProps {
  type?: 'card' | 'table' | 'list' | 'profile' | 'dashboard';
  count?: number;
}

export default function LoadingSkeleton({ type = 'card', count = 3 }: LoadingSkeletonProps) {
  if (type === 'card') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 animate-pulse">
            <div className="h-12 w-12 bg-white/10 rounded-xl mb-4"></div>
            <div className="h-6 w-3/4 bg-white/10 rounded-lg mb-3"></div>
            <div className="h-4 w-full bg-white/10 rounded-lg mb-2"></div>
            <div className="h-4 w-5/6 bg-white/10 rounded-lg mb-6"></div>
            <div className="h-10 w-full bg-white/10 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl overflow-hidden animate-pulse">
        {/* Header */}
        <div className="grid grid-cols-4 gap-4 p-6 border-b border-white/20 bg-white/5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-4 bg-white/10 rounded-lg"></div>
          ))}
        </div>
        {/* Rows */}
        {[...Array(count)].map((_, rowIdx) => (
          <div key={rowIdx} className="grid grid-cols-4 gap-4 p-6 border-b border-white/10 last:border-b-0">
            {[...Array(4)].map((_, cellIdx) => (
              <div key={cellIdx} className="h-4 bg-white/10 rounded-lg"></div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="space-y-3">
        {[...Array(count)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 animate-pulse">
            <div className="h-10 w-10 bg-white/10 rounded-lg flex-shrink-0"></div>
            <div className="flex-1">
              <div className="h-4 bg-white/10 rounded-lg mb-2 w-3/4"></div>
              <div className="h-3 bg-white/10 rounded-lg w-1/2"></div>
            </div>
            <div className="h-6 w-20 bg-white/10 rounded-lg flex-shrink-0"></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'profile') {
    return (
      <div className="animate-pulse">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 bg-white/10 rounded-full"></div>
          <div className="flex-1">
            <div className="h-6 bg-white/10 rounded-lg w-1/3 mb-2"></div>
            <div className="h-4 bg-white/10 rounded-lg w-1/4"></div>
          </div>
        </div>
        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
              <div className="h-4 bg-white/10 rounded-lg w-1/3 mb-4"></div>
              <div className="h-6 bg-white/10 rounded-lg w-2/3 mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-white/10 rounded-lg"></div>
                <div className="h-4 bg-white/10 rounded-lg w-5/6"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'dashboard') {
    return (
      <div className="animate-pulse">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4">
              <div className="h-4 bg-white/10 rounded w-1/3 mb-2"></div>
              <div className="h-8 bg-white/10 rounded w-1/2"></div>
            </div>
          ))}
        </div>
        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
            <div className="h-4 bg-white/10 rounded w-1/3 mb-4"></div>
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-4 bg-white/10 rounded"></div>
              ))}
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6">
            <div className="h-4 bg-white/10 rounded w-1/3 mb-4"></div>
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-4 bg-white/10 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
