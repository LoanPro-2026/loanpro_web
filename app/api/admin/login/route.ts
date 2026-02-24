import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check against admin credentials from environment
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;

    if (!adminEmail || !adminPassword || !jwtSecret) {
      return NextResponse.json(
        { error: 'Admin configuration is incomplete' },
        { status: 500 }
      );
    }

    // Verify credentials
    if (email !== adminEmail || password !== adminPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate JWT token (expires in 24 hours)
    const token = jwt.sign(
      {
        email: adminEmail,
        role: 'admin',
        iat: Math.floor(Date.now() / 1000),
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    return NextResponse.json({
      success: true,
      token,
      email: adminEmail,
      expiresIn: '24h',
      message: 'Admin login successful'
    }, { status: 200 });

  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}

// Health check
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'Admin login endpoint active'
  });
}
