// app/api/devices/cors.ts
export function getCorsHeaders(request: Request) {
    const origin = request.headers.get('origin');
    const allowedOrigins = [
      'http://localhost:5173',
      'https://loanpro.tech',
      'https://www.loanpro.tech',
    ];
  
    return {
      'Access-Control-Allow-Origin': allowedOrigins.includes(origin || '') ? origin || allowedOrigins[1] : allowedOrigins[1],
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Credentials': 'true',
    };
    
  }
  
  export function handlePreflight(request: Request) {
    const headers = getCorsHeaders(request);
    return new Response(null, { status: 204, headers });
  }
  