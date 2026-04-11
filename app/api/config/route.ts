import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getCorsHeaders } from '@/lib/cors';
import { getPlanFeatures } from '@/lib/planFeatures';
import { getEffectivePlanFeatures } from '@/lib/planConfig';
import { getSubscriptionStatus } from '@/lib/subscriptionHelpers';
import { logger } from '@/lib/logger';
import { enforceRequestRateLimit, parseJsonRequest, toSafeErrorResponse } from '@/lib/apiSafety';

// Remote configuration for desktop app
export async function POST(req: Request) {
  const corsHeaders = getCorsHeaders(req);
  const applyCors = (response: NextResponse) => {
    Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value));
    return response;
  };
  
  try {
    const rateLimitResponse = enforceRequestRateLimit({
      request: req,
      scope: 'config',
      limit: 90,
      windowMs: 60 * 1000,
    });
    if (rateLimitResponse) return applyCors(rateLimitResponse);

    const parsedBody = await parseJsonRequest<Record<string, unknown>>(req, { maxBytes: 96 * 1024 });
    if (!parsedBody.ok) return applyCors(parsedBody.response);

    const body = parsedBody.data as Record<string, any>;
    const accessToken = typeof body.accessToken === 'string' ? body.accessToken.trim() : '';
    const appVersion = typeof body.appVersion === 'string' ? body.appVersion.trim() : '';
    const deviceInfo = (body.deviceInfo && typeof body.deviceInfo === 'object') ? body.deviceInfo : undefined;
    
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
    const accessStatus = subscription ? getSubscriptionStatus(subscription as any) : 'expired';
    if (!subscription || accessStatus === 'expired') {
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
    const effectivePlanFeatures = await getEffectivePlanFeatures(db, subscription.subscriptionType);
    
    return NextResponse.json({
      success: true,
      config,
      subscription: {
        plan: subscription.subscriptionType,
        status: accessStatus,
        expiresAt: subscription.endDate
      },
      planFeatures: {
        maxDevices: effectivePlanFeatures.maxDevices,
        cloudStorageGB: effectivePlanFeatures.cloudStorageGB,
        features: effectivePlanFeatures.features,
      }
    }, { headers: corsHeaders });
    
  } catch (error) {
    logger.error('Config API error', error, 'CONFIG_API');
    return applyCors(toSafeErrorResponse(error, 'CONFIG_API', 'Failed to get config'));
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
      maxCustomers: -1,
      maxLoans: -1,
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
      baseConfig.limits.maxCustomers = -1;
      baseConfig.limits.maxLoans = -1;
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
