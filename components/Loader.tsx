import React from 'react';

export default function Loader({ fullscreen = false, message }: { fullscreen?: boolean; message?: string }) {
  return (
    <div className={fullscreen ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-30' : 'flex flex-col items-center justify-center'}>
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-4"></div>
      {message && <div className="text-blue-700 font-semibold text-lg mt-2 text-center drop-shadow">{message}</div>}
    </div>
  );
} 