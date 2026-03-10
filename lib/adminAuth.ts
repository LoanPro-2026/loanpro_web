import { auth } from '@clerk/nextjs/server';
import jwt from 'jsonwebtoken';
import { checkRateLimit, RateLimitPresets } from '@/lib/rateLimit';

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'your-admin-email@gmail.com').trim().toLowerCase();

interface AdminJwtPayload extends jwt.JwtPayload {
  email?: string;
  role?: string;
  permissions?: string[];
}

export type AdminPermission =
  | 'dashboard:read'
  | 'users:read'
  | 'users:write'
  | 'subscriptions:read'
  | 'subscriptions:write'
  | 'payments:read'
  | 'payments:write'
  | 'support:read'
  | 'support:write'
  | 'leads:read'
  | 'leads:write'
  | 'coupons:read'
  | 'coupons:write'
  | 'settings:read'
  | 'settings:write'
  | 'integrations:read'
  | 'audit:read'
  | 'health:read';

type AdminRole = 'admin' | 'operator';

const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  admin: [
    'dashboard:read',
    'users:read',
    'users:write',
    'subscriptions:read',
    'subscriptions:write',
    'payments:read',
    'payments:write',
    'support:read',
    'support:write',
    'leads:read',
    'leads:write',
    'coupons:read',
    'coupons:write',
    'settings:read',
    'settings:write',
    'integrations:read',
    'audit:read',
    'health:read',
  ],
  operator: [
    'dashboard:read',
    'users:read',
    'subscriptions:read',
    'payments:read',
    'support:read',
    'support:write',
    'leads:read',
    'leads:write',
    'integrations:read',
    'health:read',
  ],
};

export interface AdminAuthResult {
  email: string;
  source: 'jwt' | 'clerk' | 'api-key';
  role: AdminRole;
  permissions: AdminPermission[];
}

export async function verifyAdminRequest(request: Request): Promise<AdminAuthResult> {
  const adminApiKey = (request.headers.get('x-admin-api-key') || '').trim();
  const configuredAdminApiKey = (process.env.ADMIN_API_KEY || '').trim();
  if (configuredAdminApiKey && adminApiKey && adminApiKey === configuredAdminApiKey) {
    return {
      email: ADMIN_EMAIL,
      source: 'api-key',
      role: 'admin',
      permissions: ROLE_PERMISSIONS.admin,
    };
  }

  const authHeader = request.headers.get('authorization') || '';
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);

  if (tokenMatch) {
    const token = tokenMatch[1];
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error('Admin JWT is not configured');
    }

    let decoded: AdminJwtPayload;
    try {
      decoded = jwt.verify(token, jwtSecret) as AdminJwtPayload;
    } catch {
      throw new Error('Invalid token');
    }

    const role = (decoded.role || 'admin') as AdminRole;
    if (!ROLE_PERMISSIONS[role]) {
      throw new Error('Access denied');
    }

    const tokenEmail = String(decoded.email || '').trim().toLowerCase();
    if (!tokenEmail || tokenEmail !== ADMIN_EMAIL) {
      throw new Error('Access denied');
    }

    const tokenPermissions = Array.isArray(decoded.permissions)
      ? (decoded.permissions.filter((permission) => typeof permission === 'string') as AdminPermission[])
      : [];

    // Admin tokens always map to full admin permission set to keep control surface complete.
    const permissions = role === 'admin'
      ? ROLE_PERMISSIONS.admin
      : (tokenPermissions.length > 0 ? tokenPermissions : ROLE_PERMISSIONS[role]);

    return { email: tokenEmail, source: 'jwt', role, permissions };
  }

  const { userId } = await auth();
  if (!userId) {
    throw new Error('Unauthorized');
  }

  const clerkSecret = process.env.CLERK_SECRET_KEY;
  if (!clerkSecret) {
    throw new Error('Clerk secret is not configured');
  }

  const userResponse = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${clerkSecret}`,
    },
  });

  if (!userResponse.ok) {
    throw new Error('Failed to verify user');
  }

  const user = await userResponse.json();
  const userEmail = String(user.email_addresses?.[0]?.email_address || '').trim().toLowerCase();

  if (!userEmail || userEmail !== ADMIN_EMAIL) {
    throw new Error('Access denied');
  }

  return { email: userEmail, source: 'clerk', role: 'admin', permissions: ROLE_PERMISSIONS.admin };
}

export function hasAdminPermission(admin: AdminAuthResult, permission: AdminPermission): boolean {
  return admin.permissions.includes(permission);
}

export function getAdminErrorStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : 'Internal server error';
  if (message === 'Unauthorized') return 401;
  if (message === 'Access denied' || message === 'Invalid token') return 403;
  if (message === 'Rate limit exceeded') return 429;
  return 500;
}

interface AdminGuardOptions {
  permission: AdminPermission;
  rateLimitKey: string;
  limit?: number;
  windowMs?: number;
}

export async function enforceAdminAccess(
  request: Request,
  options: AdminGuardOptions
): Promise<AdminAuthResult> {
  const admin = await verifyAdminRequest(request);

  if (!hasAdminPermission(admin, options.permission)) {
    throw new Error('Access denied');
  }

  const limit = options.limit ?? RateLimitPresets.API.limit;
  const windowMs = options.windowMs ?? RateLimitPresets.API.windowMs;
  const key = `admin:${options.rateLimitKey}:${admin.email}`;

  if (!checkRateLimit(key, limit, windowMs)) {
    throw new Error('Rate limit exceeded');
  }

  return admin;
}
