import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getDeviceLimitForPlan, resolveEffectivePlanForUser } from '@/lib/subscriptionPlan';

async function cleanupDevices(accessToken: string) {
  try {
    const client = await clientPromise;
    const db = client.db('AdminDB');
    
    const user = await db.collection('users').findOne({ accessToken });
    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('Before cleanup:', user.devices?.length || 0, 'devices');
    
    // Keep only the most recent device (or first device if same timestamp)
    const devices = user.devices || [];
    const uniqueDevices = new Map();
    
    // Group devices by deviceId, keeping the most recent
    devices.forEach((device: any) => {
      const existing = uniqueDevices.get(device.deviceId);
      if (!existing || new Date(device.lastActive) > new Date(existing.lastActive)) {
        uniqueDevices.set(device.deviceId, device);
      }
    });
    
    const cleanedDevices = Array.from(uniqueDevices.values());
    
    // Update user with cleaned devices
    await db.collection('users').updateOne(
      { accessToken },
      { $set: { devices: cleanedDevices } }
    );
    
    console.log('After cleanup:', cleanedDevices.length, 'devices');
    return {
      before: devices.length,
      after: cleanedDevices.length,
      cleaned: devices.length - cleanedDevices.length
    };
    
  } catch (error) {
    console.error('Cleanup error:', error);
    throw error;
  }
}

async function testDeviceLimit(accessToken: string) {
  try {
    const client = await clientPromise;
    const db = client.db('AdminDB');
    
    const user = await db.collection('users').findOne({ accessToken });
    if (!user) {
      return { error: 'User not found' };
    }

    const subscriptionPlan = await resolveEffectivePlanForUser(db, user);
    const activeDevices = (user.devices || []).filter((d: any) => d.status === 'active');
    const deviceLimit = getDeviceLimitForPlan(subscriptionPlan);
    
    return {
      subscriptionPlan,
      activeDevices: activeDevices.length,
      deviceLimit,
      canAddDevice: activeDevices.length < deviceLimit,
      devices: activeDevices.map((d: any) => ({
        deviceId: d.deviceId.substring(0, 8) + '...',
        deviceName: d.deviceName,
        lastActive: d.lastActive
      }))
    };
    
  } catch (error) {
    console.error('Test error:', error);
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    const { accessToken, action } = await req.json();

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token required' }, { status: 400 });
    }

    if (action === 'cleanup') {
      const result = await cleanupDevices(accessToken);
      return NextResponse.json({ 
        success: true, 
        message: `Cleaned up ${result?.cleaned || 0} duplicate devices`,
        result 
      });
    } else if (action === 'test') {
      const result = await testDeviceLimit(accessToken);
      return NextResponse.json({ success: true, result });
    } else {
      return NextResponse.json({ error: 'Invalid action. Use "cleanup" or "test"' }, { status: 400 });
    }

  } catch (error) {
    console.error('Cleanup API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
