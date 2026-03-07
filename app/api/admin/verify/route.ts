import { enforceAdminAccess, getAdminErrorStatus } from '@/lib/adminAuth';

export async function GET(request: Request) {
  try {
    const result = await enforceAdminAccess(request, {
      permission: 'dashboard:read',
      rateLimitKey: 'verify:get',
      limit: 120,
      windowMs: 60_000,
    });
    return new Response(
      JSON.stringify({
        admin: true,
        email: result.email,
        source: result.source,
        role: result.role,
        permissions: result.permissions,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('[ADMIN VERIFY] Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = getAdminErrorStatus(error);
    return new Response(JSON.stringify({ error: message }), { status });
  }
}
