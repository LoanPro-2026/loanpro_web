export async function handleCors(request: Request) {
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    'http://localhost:5173',
    'https://loanpro.tech',
    'https://www.loanpro.tech',
  ];
  const headers = {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin || '') ? origin || allowedOrigins[1] : allowedOrigins[1],
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  return headers;
} 