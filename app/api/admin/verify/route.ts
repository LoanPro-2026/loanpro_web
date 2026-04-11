import { enforceAdminAccess, getAdminErrorStatus } from '@/lib/adminAuth';
import { getCorsHeaders, handleCorsPreFlight } from '@/lib/cors';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
  const corsHeaders = getCorsHeaders(request);

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
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    logger.error('Admin verify failed', error, 'ADMIN_VERIFY');
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = getAdminErrorStatus(error);
    return new Response(JSON.stringify({ error: message }), { status, headers: corsHeaders });
  }
}

export async function OPTIONS(request: Request) {
  return handleCorsPreFlight(request);
}
