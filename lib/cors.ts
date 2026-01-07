/**
 * CORS utilities for API routes
 * Centralizes CORS configuration to prevent duplication
 */

// Allowed origins for CORS - update based on your deployment
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'https://www.loanpro.tech',
  'https://loanpro.tech',
];

/**
 * Check if an origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Get CORS headers for a request
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  const isAllowed = isOriginAllowed(origin);

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400', // 24 hours
  };

  if (isAllowed && origin) {
    headers['Access-Control-Allow-Origin'] = origin;
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
