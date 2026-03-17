import { connectToDatabase } from '@/lib/mongodb';
import { clerkClient } from '@clerk/nextjs/server';
import { enforceAdminAccess, getAdminErrorStatus } from '@/lib/adminAuth';
import { getAdminCachedResponse, invalidateAdminCacheByTags, setAdminCachedResponse } from '@/lib/adminResponseCache';
import { writeAdminAuditLog } from '@/lib/adminAudit';

interface PasswordSetupState {
  sent: boolean;
  message: string | null;
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function GET(request: Request) {
  try {
    await enforceAdminAccess(request, {
      permission: 'users:read',
      rateLimitKey: 'users:get',
      limit: 80,
      windowMs: 60_000,
    });

    const { searchParams } = new URL(request.url);
    const search = normalizeText(searchParams.get('search'));
    const status = normalizeText(searchParams.get('status')).toLowerCase();

    const cacheKey = `admin:users:list:v2:${search}:${status}`;
    const cached = getAdminCachedResponse<any>(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { db } = await connectToDatabase();

    const userFilter: Record<string, unknown> = {};
    if (status === 'banned') userFilter.banned = true;
    if (status === 'active') userFilter.$or = [{ banned: { $exists: false } }, { banned: false }];

    if (search) {
      const regex = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      userFilter.$and = [
        ...(Array.isArray(userFilter.$and) ? userFilter.$and : []),
        {
          $or: [
            { userId: regex },
            { username: regex },
            { email: regex },
            { fullName: regex },
          ],
        },
      ];
    }

    // Get users with their latest subscription info
    const users = await db.collection('users')
      .aggregate<any>([
        { $match: userFilter },
        {
          $lookup: {
            from: 'subscriptions',
            localField: 'userId',
            foreignField: 'userId',
            as: 'subscriptionData'
          }
        },
        {
          $addFields: {
            latestSubscription: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: '$subscriptionData',
                    as: 'sub',
                    cond: { $ne: ['$$sub.status', 'expired'] }
                  }
                },
                0
              ]
            }
          }
        },
        {
          $project: {
            _id: 1,
            userId: 1,
            username: 1,
            email: 1,
            fullName: 1,
            banned: 1,
            status: 1,
            accessToken: 1,
            createdAt: 1,
            lastLogin: 1,
            updatedAt: 1,
            subscription: {
              plan: '$latestSubscription.plan',
              status: '$latestSubscription.status',
              endDate: '$latestSubscription.endDate',
              billingPeriod: '$latestSubscription.billingPeriod'
            }
          }
        },
        { $sort: { createdAt: -1 } }
      ])
      .toArray();

    const payload = { success: true, users };
    setAdminCachedResponse(cacheKey, payload, 20_000, ['users', 'dashboard']);

    return new Response(JSON.stringify(payload), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return new Response(JSON.stringify({ success: false, error: 'Failed to fetch users' }), { 
      status: getAdminErrorStatus(error),
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await enforceAdminAccess(request, {
      permission: 'users:write',
      rateLimitKey: 'users:create:post',
      limit: 25,
      windowMs: 60_000,
    });

    const body = await request.json();
    const userId = normalizeText(body?.userId);
    const username = normalizeText(body?.username);
    const email = normalizeText(body?.email).toLowerCase();
    const fullName = normalizeText(body?.fullName);
    const shouldSyncClerk = body?.syncWithClerk !== false;

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: 'email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!shouldSyncClerk && (!userId || !username)) {
      return new Response(
        JSON.stringify({ success: false, error: 'userId and username are required when syncWithClerk is false' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (shouldSyncClerk && !userId && !username) {
      return new Response(
        JSON.stringify({ success: false, error: 'username is required when creating a new Clerk user' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!email.includes('@')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { db } = await connectToDatabase();

    const duplicateChecks: Array<Record<string, unknown>> = [{ email }];
    if (username) duplicateChecks.push({ username });

    const existing = await db.collection('users').findOne({ $or: duplicateChecks });

    if (existing) {
      return new Response(
        JSON.stringify({ success: false, error: 'User with same username or email already exists' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let effectiveUserId = userId;
    let effectiveUsername = username;
    const passwordSetup: PasswordSetupState = {
      sent: false,
      message: null,
    };

    if (shouldSyncClerk) {
      const clerk = await clerkClient();
      try {
        if (userId.startsWith('user_')) {
          // If the caller already provides a Clerk user id, verify it exists.
          const existingClerkUser = await clerk.users.getUser(userId);
          effectiveUserId = existingClerkUser.id;
          const clerkUsername = normalizeText(existingClerkUser.username);
          if (!effectiveUsername && clerkUsername) {
            effectiveUsername = clerkUsername;
          }
        } else {
          const [firstName, ...rest] = fullName.split(/\s+/).filter(Boolean);
          const lastName = rest.join(' ');
          const createdClerkUser = await clerk.users.createUser({
            emailAddress: [email],
            username: effectiveUsername || undefined,
            firstName: firstName || undefined,
            lastName: lastName || undefined,
            skipPasswordChecks: true,
            skipPasswordRequirement: true,
            unsafeMetadata: {
              source: 'admin-panel',
              requestedUserId: userId || null,
            },
          } as any);
          effectiveUserId = createdClerkUser.id;
          const createdUsername = normalizeText(createdClerkUser.username);
          if (createdUsername) {
            effectiveUsername = createdUsername;
          }
        }

        // Best-effort password setup email for users created by admin.
        // Clerk handles password securely in hosted flows instead of server-set passwords.
        try {
          const clerkAny = clerk as any;
          if (typeof clerkAny?.invitations?.createInvitation === 'function') {
            await clerkAny.invitations.createInvitation({
              emailAddress: email,
              ignoreExisting: true,
              publicMetadata: {
                source: 'admin-panel',
                purpose: 'password-setup',
              },
            });
            passwordSetup.sent = true;
            passwordSetup.message = 'Password setup email sent via Clerk invitation flow.';
          } else {
            passwordSetup.message = 'User created, but Clerk invitation API is unavailable in this runtime.';
          }
        } catch (inviteError: any) {
          const inviteErrorMessage = inviteError?.errors?.[0]?.message || inviteError?.message || 'Unable to send password setup email';
          passwordSetup.message = `User created, but password setup email could not be sent: ${inviteErrorMessage}`;
        }
      } catch (clerkError: any) {
        const clerkErrorMessage = clerkError?.errors?.[0]?.message || clerkError?.message || 'Clerk sync failed';
        return new Response(
          JSON.stringify({ success: false, error: `Failed to sync Clerk user: ${clerkErrorMessage}` }),
          { status: 502, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!effectiveUsername) {
      effectiveUsername = email.split('@')[0] || `user_${Date.now()}`;
    }

    if (!effectiveUserId) {
      effectiveUserId = `local_${Date.now()}`;
    }

    const userIdConflict = await db.collection('users').findOne({ userId: effectiveUserId });
    if (userIdConflict) {
      return new Response(
        JSON.stringify({ success: false, error: 'User with same userId already exists' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const doc = {
      userId: effectiveUserId,
      username: effectiveUsername,
      email,
      fullName,
      accessToken: normalizeText(body?.accessToken) || null,
      banned: Boolean(body?.banned),
      status: normalizeText(body?.status) || 'active',
      devices: Array.isArray(body?.devices) ? body.devices : [],
      dataUsage: Number.isFinite(Number(body?.dataUsage)) ? Number(body.dataUsage) : 0,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection('users').insertOne(doc);

    await writeAdminAuditLog({
      actorEmail: admin.email,
      action: 'users.create',
      targetType: 'user',
      targetId: result.insertedId.toString(),
      details: {
        userId: effectiveUserId,
        email,
        clerkSynced: shouldSyncClerk,
        passwordSetupEmailSent: passwordSetup.sent,
      },
    });

    invalidateAdminCacheByTags(['users', 'dashboard', 'analytics']);

    return new Response(
      JSON.stringify({
        success: true,
        user: { ...doc, _id: result.insertedId },
        passwordSetupEmailSent: passwordSetup.sent,
        passwordSetupMessage: passwordSetup.message,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating user:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to create user' }),
      { status: getAdminErrorStatus(error), headers: { 'Content-Type': 'application/json' } }
    );
  }
}
