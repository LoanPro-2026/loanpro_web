import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { enforceAdminAccess, getAdminErrorStatus } from '@/lib/adminAuth';
import { getAdminCachedResponse, invalidateAdminCacheByTags, setAdminCachedResponse } from '@/lib/adminResponseCache';

export async function POST(request: Request) {
  try {
    const authResult = await enforceAdminAccess(request, {
      permission: 'settings:write',
      rateLimitKey: 'settings:pricing:post',
      limit: 15,
      windowMs: 60_000,
    });

    const client = await clientPromise;
    const db = client.db('AdminDB');

    const { prices } = await request.json();

    if (!prices || typeof prices !== 'object') {
      return NextResponse.json(
        { error: 'Invalid prices format' },
        { status: 400 }
      );
    }

    // Validate prices
    const requiredPlans = ['Basic', 'Pro', 'Enterprise'];
    for (const plan of requiredPlans) {
      if (!(plan in prices) || typeof prices[plan] !== 'number' || prices[plan] <= 0) {
        return NextResponse.json(
          { error: `Invalid price for ${plan} plan` },
          { status: 400 }
        );
      }
    }

    // Store pricing in a configuration collection
    const result = await db.collection('pricing_config').findOneAndUpdate(
      { configName: 'current_pricing' },
      {
        $set: {
          configName: 'current_pricing',
          prices: {
            Basic: prices.Basic,
            Pro: prices.Pro,
            Enterprise: prices.Enterprise
          },
          updatedAt: new Date(),
          updatedBy: authResult.email
        }
      },
      { upsert: true, returnDocument: 'after' }
    );

    invalidateAdminCacheByTags(['settings', 'dashboard']);

    return NextResponse.json({
      success: true,
      message: 'Pricing updated successfully',
      prices: result?.prices || prices
    });
  } catch (error) {
    console.error('Error updating pricing:', error);
    return NextResponse.json(
      { error: 'Failed to update pricing' },
      { status: getAdminErrorStatus(error) }
    );
  }
}

// GET endpoint to retrieve current pricing
export async function GET(request: Request) {
  try {
    await enforceAdminAccess(request, {
      permission: 'settings:read',
      rateLimitKey: 'settings:pricing:get',
      limit: 80,
      windowMs: 60_000,
    });

    const cacheKey = 'admin:pricing:get:v1';
    const cached = getAdminCachedResponse<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const client = await clientPromise;
    const db = client.db('AdminDB');

    const config = await db.collection('pricing_config').findOne({ configName: 'current_pricing' });

    if (!config || !config.prices) {
      // Return default prices if not set
      const payload = {
        success: true,
        prices: {
          Basic: 699,
          Pro: 833,
          Enterprise: 979
        },
        isDefault: true
      };

      setAdminCachedResponse(cacheKey, payload, 30_000, ['settings']);
      return NextResponse.json(payload);
    }

    const payload = {
      success: true,
      prices: config.prices,
      updatedAt: config.updatedAt,
      isDefault: false
    };

    setAdminCachedResponse(cacheKey, payload, 30_000, ['settings']);
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error fetching pricing:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing' },
      { status: getAdminErrorStatus(error) }
    );
  }
}
