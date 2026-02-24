import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getCorsHeaders } from '@/lib/cors';

// Remote configuration for desktop app
export async function POST(req: Request) {
  const corsHeaders = getCorsHeaders(req);
  
  try {
    const { accessToken, appVersion, deviceInfo } = await req.json();
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing accessToken' }, { status: 400, headers: corsHeaders });
    }
    
    const client = await clientPromise;
    const db = client.db('AdminDB');
    
    // Verify access token and get user subscription
    const user = await db.collection('users').findOne({ accessToken });
    if (!user) {
      return NextResponse.json({ error: 'Invalid access token' }, { status: 401, headers: corsHeaders });
    }
    
    const subscription = await db.collection('subscriptions').findOne({ userId: user.userId });
    if (!subscription || subscription.status !== 'active') {
      return NextResponse.json({ error: 'No active subscription' }, { status: 403, headers: corsHeaders });
    }
    
    // Update device info
    await db.collection('users').updateOne(
      { accessToken, 'devices.deviceId': deviceInfo?.deviceId },
      { 
        $set: { 
          'devices.$.appVersion': appVersion,
          'devices.$.lastActive': new Date(),
          'devices.$.deviceInfo': deviceInfo
        } 
      }
    );
    
    // Get configuration based on subscription plan
    const config = await getConfigForPlan(subscription.subscriptionType, appVersion);
    
    return NextResponse.json({
      success: true,
      config,
      subscription: {
        plan: subscription.subscriptionType,
        status: subscription.status,
        expiresAt: subscription.endDate
      }
    }, { headers: corsHeaders });
    
  } catch (error) {
    console.error('Config API error:', error);
    return NextResponse.json({ error: 'Failed to get config' }, { status: 500, headers: corsHeaders });
  }
}

async function getConfigForPlan(plan: string, appVersion: string) {
  // Base configuration
  const baseConfig = {
    features: {
      fingerprint: true,
      autoBackup: true,
      dataExport: true,
      basicReports: true,
      advancedReports: false,
      bulkOperations: false,
      apiAccess: false,
    } as any,
    limits: {
      maxCustomers: 1000,
      maxLoans: 5000,
      maxBackups: 10,
    },
    ui: {
      theme: 'auto',
      advancedFilters: false,
      customDashboard: false,
    },
    integrations: {
      paymentGateway: false,
      smsService: false,
      emailService: false,
    },
    updateChannel: 'stable'
  };
  
  // Enhanced features based on plan
  switch (plan) {
    case '6months':
      baseConfig.features.advancedReports = true;
      baseConfig.limits.maxCustomers = 5000;
      baseConfig.limits.maxLoans = 25000;
      baseConfig.ui.advancedFilters = true;
      baseConfig.integrations.paymentGateway = true;
      break;
      
    case 'yearly':
      baseConfig.features.advancedReports = true;
      baseConfig.features.bulkOperations = true;
      baseConfig.features.apiAccess = true;
      baseConfig.limits.maxCustomers = -1; // Unlimited
      baseConfig.limits.maxLoans = -1; // Unlimited
      baseConfig.limits.maxBackups = 50;
      baseConfig.ui.advancedFilters = true;
      baseConfig.ui.customDashboard = true;
      baseConfig.integrations.paymentGateway = true;
      baseConfig.integrations.smsService = true;
      baseConfig.integrations.emailService = true;
      baseConfig.updateChannel = 'beta'; // Early access
      break;
  }
  
  return baseConfig;
}

export function OPTIONS(req: Request) {
  const corsHeaders = getCorsHeaders(req);
  return new Response(null, { status: 204, headers: corsHeaders });
}
