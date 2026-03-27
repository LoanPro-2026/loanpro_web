/**
 * CORS utilities for API routes
 * Centralizes CORS configuration to prevent duplication
 */

// Allowed origins for CORS - update based on your deployment
const ALLOWED_ORIGINS = [
  'https://www.loanpro.tech',
  'https://loanpro.tech',
];

/**
 * Check if an origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
  // Allow requests with no origin (Electron apps, mobile apps, etc.)
  if (!origin || origin === 'null' || origin.startsWith('file://')) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Get CORS headers for a request
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  const isAllowed = isOriginAllowed(origin);

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-user-id, x-admin-token',
    'Access-Control-Max-Age': '86400', // 24 hours
  };

  if (isAllowed) {
    // Allow all origins for desktop/mobile apps or set specific origin for web
    headers['Access-Control-Allow-Origin'] = origin || '*';
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

/**
 * Handle CORS preflight requests
 * Use this in your API routes before processing the actual request
 * 
 * Example:
 * if (req.method === 'OPTIONS') {
 *   return handleCorsPreFlight(req);
 * }
 */
export function handleCorsPreFlight(req: Request) {
  const corsHeaders = getCorsHeaders(req);
  
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}
