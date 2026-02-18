import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/get-token
 * Returns the admin secret token for authenticated admin users
 * The admin must have already authenticated with password on the admin panel
 */
export async function GET(req: NextRequest) {
  try {
    // Get the admin token from environment
    const adminToken = process.env.ADMIN_SECRET_TOKEN;

    if (!adminToken) {
      return NextResponse.json(
        { success: false, error: 'Admin token not configured' },
        { status: 500 }
      );
    }

    // Return the token
    return NextResponse.json({
      success: true,
      token: adminToken
    });
  } catch (error: any) {
    console.error('Error getting admin token:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get admin token' },
      { status: 500 }
    );
  }
}
