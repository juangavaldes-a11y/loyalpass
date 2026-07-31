import { NextResponse } from 'next/server';
import { createSessionToken, getSessionCookieName } from '@/lib/auth/session';
import { backendRequest } from '@/lib/api/backend';

export async function POST(request) {
  try {
    const payload = await request.json();
    const { email, password } = payload;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const backendResponse = await backendRequest('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    const token = await createSessionToken({
      sub: backendResponse.data.email,
      role: backendResponse.data.role,
      businessId: backendResponse.data.businessId,
      apiKey: backendResponse.data.apiKey,
      accessToken: backendResponse.data.accessToken,
      email: backendResponse.data.email,
    });

    const response = NextResponse.json(
      {
        success: true,
        data: {
          role: backendResponse.data.role,
          email: backendResponse.data.email,
        },
      },
      { status: 200 }
    );

    response.cookies.set({
      name: getSessionCookieName(),
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Login failed',
      },
      { status: 500 }
    );
  }
}
