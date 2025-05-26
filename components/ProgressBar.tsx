import React from 'react';

export default function ProgressBar({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="fixed top-0 left-0 w-full z-[100]">
      <div className="h-1 w-full bg-blue-200">
        <div className="h-1 bg-blue-600 animate-progress-bar rounded-r-full" style={{ width: '40%' }}></div>
      </div>
      <style jsx>{`
        @keyframes progress-bar {
          0% { width: 0%; }
          50% { width: 60%; }
          100% { width: 100%; }
        }
        .animate-progress-bar {
          animation: progress-bar 1.2s cubic-bezier(0.4,0,0.2,1) infinite;
        }
      `}</style>
    </div>
  );
} 