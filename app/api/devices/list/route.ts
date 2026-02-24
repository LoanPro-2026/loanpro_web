import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getCorsHeaders, handleCorsPreFlight } from '@/lib/cors';

export function OPTIONS(req: Request) {
  return handleCorsPreFlight(req);
}

export async function POST(req: Request) {
  const corsHeaders = getCorsHeaders(req);

  try {
    const { accessToken } = await req.json();

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token required' }, { status: 400, headers: corsHeaders });
    }

    const client = await clientPromise;
    const db = client.db('AdminDB');
    const user = await db.collection('users').findOne({ accessToken });

    if (!user) {
      return NextResponse.json({ 
        error: 'Invalid access token',
        status: 'invalid_token'
      }, { status: 401, headers: corsHeaders });
    }

    const devices = user.devices || [];
    const activeDevices = devices.filter((device: any) => device.status === 'active');

    // Get device limits based on subscription plan
    const getDeviceLimit = (plan: string) => {
      switch (plan?.toLowerCase()) {
        case 'basic':
        case 'pro':
          return 1;
        case 'enterprise':
          return 2;
        default:
          return 1; // Default to 1 for safety
      }
    };

    const subscriptionPlan = user.subscriptionPlan || 'basic';
    const deviceLimit = getDeviceLimit(subscriptionPlan);

    return NextResponse.json({
      success: true,
      devices: activeDevices,
      deviceCount: activeDevices.length,
      deviceLimit: deviceLimit,
      canAddDevice: activeDevices.length < deviceLimit,
      subscriptionPlan: subscriptionPlan
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error listing devices:', error);
    return NextResponse.json(
      { error: 'Error listing devices' },
      { status: 500, headers: corsHeaders }
    );
  }
}
