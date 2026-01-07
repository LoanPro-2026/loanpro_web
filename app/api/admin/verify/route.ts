import { auth } from '@clerk/nextjs/server';

// Admin email - Update this with your actual admin email
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'your-admin-email@gmail.com';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    console.log('[ADMIN VERIFY] Checking admin access for userId:', userId);
    console.log('[ADMIN VERIFY] Admin email configured:', ADMIN_EMAIL);

    if (!userId) {
      console.log('[ADMIN VERIFY] No userId - unauthorized');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // Get user details from Clerk
    const userResponse = await fetch(
      `https://api.clerk.com/v1/users/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        },
      }
    );

    if (!userResponse.ok) {
      console.log('[ADMIN VERIFY] Failed to fetch user from Clerk:', userResponse.status);
      return new Response(JSON.stringify({ error: 'Failed to verify user' }), { status: 403 });
    }

    const user = await userResponse.json();
    const userEmail = user.email_addresses[0]?.email_address;

    console.log('[ADMIN VERIFY] User email:', userEmail);

    // Check if user is admin
    if (userEmail !== ADMIN_EMAIL) {
      console.log('[ADMIN VERIFY] Access denied - not admin email');
      return new Response(JSON.stringify({ error: 'Access denied' }), { status: 403 });
    }

    console.log('[ADMIN VERIFY] Admin access granted');
    return new Response(JSON.stringify({ admin: true, email: userEmail }), { status: 200 });
  } catch (error) {
    console.error('[ADMIN VERIFY] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
