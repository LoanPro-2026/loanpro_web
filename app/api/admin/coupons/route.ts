import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { enforceAdminAccess, getAdminErrorStatus } from '@/lib/adminAuth';
import { connectToDatabase } from '@/lib/mongodb';
import { writeAdminAuditLog } from '@/lib/adminAudit';
import { getAdminCachedResponse, invalidateAdminCacheByTags, setAdminCachedResponse } from '@/lib/adminResponseCache';

export async function GET(request: NextRequest) {
  try {
    await enforceAdminAccess(request, {
      permission: 'coupons:read',
      rateLimitKey: 'coupons:get',
      limit: 80,
      windowMs: 60_000,
    });
    const { db } = await connectToDatabase();

    const url = new URL(request.url);
    const cacheKey = `admin:coupons:get:v1:${url.searchParams.toString()}`;
    const cached = getAdminCachedResponse<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const status = url.searchParams.get('status') || 'all';
    const search = (url.searchParams.get('search') || '').trim();

    const filter: Record<string, unknown> = {};
    if (status === 'active') filter.active = true;
    if (status === 'inactive') filter.active = false;
    if (search) filter.code = { $regex: search, $options: 'i' };

    const coupons = await db
      .collection('coupons')
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray();

    const payload = { success: true, coupons };
    setAdminCachedResponse(cacheKey, payload, 20_000, ['coupons']);

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch coupons' },
      { status: getAdminErrorStatus(error) }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await enforceAdminAccess(request, {
      permission: 'coupons:write',
      rateLimitKey: 'coupons:post',
      limit: 20,
      windowMs: 60_000,
    });
    const body = await request.json();

    const allowedKeys = ['code', 'discountType', 'discountValue', 'maxUses', 'expiresAt'];
    const extraKeys = Object.keys(body || {}).filter((key) => !allowedKeys.includes(key));
    if (extraKeys.length > 0) {
      return NextResponse.json({ success: false, error: `Unsupported fields: ${extraKeys.join(', ')}` }, { status: 400 });
    }

    const code = String(body?.code || '').trim().toUpperCase();
    const discountType = String(body?.discountType || '').trim();
    const discountValue = Number(body?.discountValue || 0);
    const maxUses = Number(body?.maxUses || 0);
    const expiresAtRaw = body?.expiresAt ? new Date(body.expiresAt) : null;

    if (!code || code.length < 3 || code.length > 30 || !/^[A-Z0-9_-]+$/.test(code)) {
      return NextResponse.json(
        { success: false, error: 'Coupon code must be 3-30 chars and contain only A-Z, 0-9, _ or -' },
        { status: 400 }
      );
    }

    if (!['percentage', 'flat'].includes(discountType)) {
      return NextResponse.json({ success: false, error: 'Invalid discount type' }, { status: 400 });
    }

    if (discountValue <= 0) {
      return NextResponse.json({ success: false, error: 'Discount value must be positive' }, { status: 400 });
    }

    if (discountType === 'percentage' && discountValue > 100) {
      return NextResponse.json({ success: false, error: 'Percentage discount cannot exceed 100' }, { status: 400 });
    }

    if (!Number.isInteger(maxUses) || maxUses < 0 || maxUses > 1_000_000) {
      return NextResponse.json({ success: false, error: 'maxUses must be a non-negative integer' }, { status: 400 });
    }

    if (expiresAtRaw && Number.isNaN(expiresAtRaw.getTime())) {
      return NextResponse.json({ success: false, error: 'Invalid expiry date' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const existing = await db.collection('coupons').findOne({ code });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Coupon code already exists' }, { status: 409 });
    }

    const now = new Date();
    const coupon = {
      code,
      discountType,
      discountValue,
      maxUses,
      usedCount: 0,
      active: true,
      expiresAt: expiresAtRaw,
      createdBy: admin.email,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection('coupons').insertOne(coupon);

    await writeAdminAuditLog({
      actorEmail: admin.email,
      action: 'coupon.create',
      targetType: 'coupon',
      targetId: result.insertedId.toString(),
      details: { code, discountType, discountValue, maxUses },
    });

    invalidateAdminCacheByTags(['coupons']);

    return NextResponse.json({ success: true, coupon: { ...coupon, _id: result.insertedId } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create coupon' },
      { status: getAdminErrorStatus(error) }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await enforceAdminAccess(request, {
      permission: 'coupons:write',
      rateLimitKey: 'coupons:patch',
      limit: 30,
      windowMs: 60_000,
    });
    const body = await request.json();

    const allowedKeys = ['couponId', 'active', 'maxUses', 'expiresAt'];
    const extraKeys = Object.keys(body || {}).filter((key) => !allowedKeys.includes(key));
    if (extraKeys.length > 0) {
      return NextResponse.json({ success: false, error: `Unsupported fields: ${extraKeys.join(', ')}` }, { status: 400 });
    }

    const couponId = String(body?.couponId || '').trim();
    if (!ObjectId.isValid(couponId)) {
      return NextResponse.json({ success: false, error: 'Invalid couponId' }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (typeof body.active === 'boolean') updates.active = body.active;
    if (typeof body.maxUses === 'number' && Number.isInteger(body.maxUses) && body.maxUses >= 0) {
      updates.maxUses = body.maxUses;
    }
    if (body.expiresAt !== undefined) {
      if (!body.expiresAt) {
        updates.expiresAt = null;
      } else {
        const parsed = new Date(body.expiresAt);
        if (Number.isNaN(parsed.getTime())) {
          return NextResponse.json({ success: false, error: 'Invalid expiry date' }, { status: 400 });
        }
        updates.expiresAt = parsed;
      }
    }

    const { db } = await connectToDatabase();
    const result = await db.collection('coupons').findOneAndUpdate(
      { _id: new ObjectId(couponId) },
      { $set: updates },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ success: false, error: 'Coupon not found' }, { status: 404 });
    }

    await writeAdminAuditLog({
      actorEmail: admin.email,
      action: 'coupon.update',
      targetType: 'coupon',
      targetId: couponId,
      details: updates,
    });

    invalidateAdminCacheByTags(['coupons']);

    return NextResponse.json({ success: true, coupon: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update coupon' },
      { status: getAdminErrorStatus(error) }
    );
  }
}
