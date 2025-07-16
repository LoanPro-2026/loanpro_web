'use client';
import React, { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import DevicesIcon from '@mui/icons-material/Devices';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import ComputerIcon from '@mui/icons-material/Computer';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DeleteIcon from '@mui/icons-material/Delete';

interface Device {
  deviceId: string;
  deviceName: string;
  status: 'active' | 'pending' | 'revoked';
  lastActive: string;
  appVersion?: string;
  deviceInfo?: {
    platform: string;
    osVersion: string;
  };
}

interface DeviceUsage {
  _id: string;
  sessions: number;
  totalDuration: number;
  lastUsed: string;
}

const DeviceManagement = () => {
  const { user } = useUser();
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceUsage, setDeviceUsage] = useState<DeviceUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDevices();
    fetchDeviceUsage();
  }, []);

  const fetchDevices = async () => {
    try {
      const response = await fetch('/api/devices');
      if (!response.ok) throw new Error('Failed to fetch devices');
      const data = await response.json();
      setDevices(data.devices || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching devices');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeviceUsage = async () => {
    try {
      const response = await fetch(`/api/analytics?timeframe=30d&userId=${user?.id}`);
      if (!response.ok) throw new Error('Failed to fetch usage');
      const data = await response.json();
      setDeviceUsage(data.deviceUsage || []);
    } catch (err) {
      console.error('Error fetching device usage:', err);
    }
  };

  const revokeDevice = async (deviceId: string) => {
    if (!confirm('Are you sure you want to revoke this device? This will prevent it from accessing your account.')) {
      return;
    }

    try {
      const response = await fetch('/api/devices/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId })
      });

      if (!response.ok) throw new Error('Failed to revoke device');
      
      // Refresh devices list
      fetchDevices();
    } catch (err) {
      alert(`Error revoking device: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const getDeviceIcon = (deviceInfo?: Device['deviceInfo']) => {
    if (deviceInfo?.platform?.toLowerCase().includes('mobile')) {
      return <SmartphoneIcon className="text-2xl" />;
    }
    return <ComputerIcon className="text-2xl" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="text-green-600" />;
      case 'pending':
        return <AccessTimeIcon className="text-yellow-600" />;
      case 'revoked':
        return <ErrorIcon className="text-red-600" />;
      default:
        return <ErrorIcon className="text-gray-400" />;
    }
  };

  const getUsageForDevice = (deviceId: string) => {
    return deviceUsage.find(usage => usage._id === deviceId);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="text-gray-600">Loading devices...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-3 mb-6">
        <DevicesIcon className="text-2xl text-blue-600" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Device Management</h2>
      </div>

      {devices.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No devices registered yet. Install and sign in to the desktop app to see devices here.
        </div>
      ) : (
        <div className="space-y-4">
          {devices.map((device) => {
            const usage = getUsageForDevice(device.deviceId);
            return (
              <div
                key={device.deviceId}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="text-gray-600 dark:text-gray-400 mt-1">
                      {getDeviceIcon(device.deviceInfo)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {device.deviceName || 'Unnamed Device'}
                        </h3>
                        {getStatusIcon(device.status)}
                        <span className={`text-sm px-2 py-1 rounded-full ${
                          device.status === 'active' ? 'bg-green-100 text-green-800' :
                          device.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {device.status}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <div>Device ID: <span className="font-mono text-xs">{device.deviceId.slice(0, 8)}...</span></div>
                        <div>Last active: {new Date(device.lastActive).toLocaleString()}</div>
                        {device.appVersion && (
                          <div>App version: {device.appVersion}</div>
                        )}
                        {device.deviceInfo && (
                          <div>Platform: {device.deviceInfo.platform} {device.deviceInfo.osVersion}</div>
                        )}
                        {usage && (
                          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
                            <div>Sessions this month: {usage.sessions}</div>
                            <div>Total usage: {formatDuration(usage.totalDuration)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {device.status === 'active' && (
                      <button
                        onClick={() => revokeDevice(device.deviceId)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition text-sm font-medium flex items-center gap-1"
                      >
                        <DeleteIcon className="text-sm" />
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Device Security Tips</h3>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Only authorize devices you personally own and control</li>
          <li>• Revoke access for lost or stolen devices immediately</li>
          <li>• Monitor device activity regularly for suspicious access</li>
          <li>• Keep your desktop app updated to the latest version</li>
        </ul>
      </div>
    </div>
  );
};

export default DeviceManagement;
