import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import clientPromise from '@/lib/mongodb';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's email from Clerk
    const client = await clientPromise;
    const db = client.db('AdminDB');
    
    // First check if user is admin
    const adminUser = await db.collection('users').findOne({ userId });
    const adminEmail = process.env.ADMIN_EMAIL || '';
    
    if (!adminUser || adminUser.email !== adminEmail) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

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
          updatedBy: userId
        }
      },
      { upsert: true, returnDocument: 'after' }
    );

    return NextResponse.json({
      success: true,
      message: 'Pricing updated successfully',
      prices: result?.prices || prices
    });
  } catch (error) {
    console.error('Error updating pricing:', error);
    return NextResponse.json(
      { error: 'Failed to update pricing' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve current pricing
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('AdminDB');

    const config = await db.collection('pricing_config').findOne({ configName: 'current_pricing' });

    if (!config || !config.prices) {
      // Return default prices if not set
      return NextResponse.json({
        success: true,
        prices: {
          Basic: 699,
          Pro: 833,
          Enterprise: 979
        },
        isDefault: true
      });
    }

    return NextResponse.json({
      success: true,
      prices: config.prices,
      updatedAt: config.updatedAt,
      isDefault: false
    });
  } catch (error) {
    console.error('Error fetching pricing:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing' },
      { status: 500 }
    );
  }
}
