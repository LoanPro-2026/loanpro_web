'use client';

import { useState, useEffect } from 'react';
import { ArrowDownTrayIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface UpdateNotificationProps {
  className?: string;
}

export default function UpdateNotification({ className = '' }: UpdateNotificationProps) {
  const [latestVersion, setLatestVersion] = useState<string>('');
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [releaseDate, setReleaseDate] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/desktop/version')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setLatestVersion(data.version);
          setDownloadUrl(data.downloadUrl);
          setReleaseDate(data.releaseDate);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = () => {
    if (downloadUrl) {
      // Track download
      fetch('/api/desktop/download?version=' + latestVersion)
        .catch(console.error);
      
      // Start download
      window.location.href = downloadUrl;
    }
  };

  if (loading) {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span className="text-blue-800">Checking for latest version...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <InformationCircleIcon className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold text-green-900 mb-2">
            Latest Version Available: v{latestVersion}
          </h3>
          <p className="text-green-800 text-sm mb-3">
            Released on {new Date(releaseDate).toLocaleDateString()}
          </p>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-200"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Download Now
          </button>
        </div>
      </div>
    </div>
  );
}
