import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getCorsHeaders, handleCorsPreFlight } from '@/lib/cors';
import emailService from '@/services/emailService';
import { getDeviceLimitForPlan, resolveEffectivePlanForUser } from '@/lib/subscriptionPlan';

export function OPTIONS(req: Request) {
  return handleCorsPreFlight(req); // ✅ Returns only a Response
}

export async function POST(req: Request) {
  const corsHeaders = getCorsHeaders(req); // ✅ Returns headers only

  try {
    const { accessToken, deviceId, deviceName, organizationName } = await req.json();

    if (!accessToken) return NextResponse.json({ error: 'Missing accessToken' }, { status: 400, headers: corsHeaders });
    if (!deviceId) return NextResponse.json({ error: 'Missing deviceId' }, { status: 400, headers: corsHeaders });

    const client = await clientPromise;
    const db = client.db('AdminDB');
    const user = await db.collection('users').findOne({ accessToken });

    if (!user) return NextResponse.json({ error: 'Invalid access token' }, { status: 401, headers: corsHeaders });

    const resolvedEmail = user.email || '';
    const resolvedName =
      user.fullName ||
      user.username ||
      (resolvedEmail ? resolvedEmail.split('@')[0] : 'Customer');

    const subscriptionPlan = await resolveEffectivePlanForUser(db, user);
    const deviceLimit = getDeviceLimitForPlan(subscriptionPlan);
    const activeDevices = (user.devices || []).filter((d: any) => d.status === 'active');

    // Check if device already exists (update case)
    const existingDevice = activeDevices.find((d: any) => d.deviceId === deviceId);
    if (existingDevice) {
      // Update existing device info
      await db.collection('users').updateOne(
        { accessToken, 'devices.deviceId': deviceId },
        { 
          $set: { 
            'devices.$.deviceName': deviceName || existingDevice.deviceName,
            'devices.$.organizationName': organizationName || existingDevice.organizationName,
            'devices.$.lastActive': new Date()
          } 
        }
      );

      if (resolvedEmail) {
        const effectiveDeviceName = deviceName || existingDevice.deviceName || 'Unnamed Device';
        Promise.resolve(
          emailService.sendDeviceUpdatedEmail({
            userName: resolvedName,
            userEmail: resolvedEmail,
            deviceName: effectiveDeviceName,
            deviceId,
            organizationName: organizationName || existingDevice.organizationName
          })
        ).catch(() => undefined);
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Device information updated', 
        device: { ...existingDevice, deviceName, organizationName }
      }, { headers: corsHeaders });
    }

    const deviceEntry = {
      deviceId,
      deviceName: deviceName || 'Unnamed Device',
      organizationName: organizationName || '',
      status: 'active',
      lastActive: new Date(),
    };

    // ATOMIC OPERATION: Add device only if under limit
    // This prevents race condition where two devices bind simultaneously
    const result = await db.collection('users').updateOne(
      { 
        accessToken,
        $expr: { 
          $lt: [
            { 
              $size: { 
                $filter: {
                  input: { $ifNull: ['$devices', []] },
                  as: 'device',
                  cond: { $eq: ['$$device.status', 'active'] }
                }
              }
            },
            deviceLimit
          ]
        }
      },
      { $push: { devices: deviceEntry } } as any
    );

    // If update failed, device limit was exceeded
    if (result.matchedCount === 0) {
      // Re-fetch to get current count for error message
      const updatedUser = await db.collection('users').findOne({ accessToken });
      const currentActiveDevices = (updatedUser?.devices || []).filter((d: any) => d.status === 'active');
      
      return NextResponse.json({ 
        error: 'DEVICE_LIMIT_EXCEEDED',
        message: `Your ${subscriptionPlan} plan allows only ${deviceLimit} device(s). You currently have ${currentActiveDevices.length} active device(s).`,
        currentDevices: currentActiveDevices.length,
        deviceLimit: deviceLimit,
        subscriptionPlan: subscriptionPlan,
        devices: currentActiveDevices.map((d: any) => ({
          deviceId: d.deviceId,
          deviceName: d.deviceName,
          lastActive: d.lastActive
        }))
      }, { status: 403, headers: corsHeaders });
    }

    if (resolvedEmail) {
      Promise.resolve(
        emailService.sendDeviceBoundEmail({
          userName: resolvedName,
          userEmail: resolvedEmail,
          deviceName: deviceEntry.deviceName,
          deviceId: deviceEntry.deviceId,
          organizationName: deviceEntry.organizationName
        })
      ).catch(() => undefined);
    }

    return NextResponse.json({ success: true, message: 'Device bound successfully', device: deviceEntry }, { headers: corsHeaders });

  } catch (error) {
    console.error('Device bind API error:', error);
    return NextResponse.json({ error: 'Failed to bind device' }, { status: 500, headers: corsHeaders });
  }
}
