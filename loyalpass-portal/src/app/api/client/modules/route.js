import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { backendRequest } from '@/lib/api/backend';
import { toApiError } from '@/lib/api/errors';
import { getSessionCookieName, verifySessionToken } from '@/lib/auth/session';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(getSessionCookieName())?.value;
    const session = await verifySessionToken(token);
    if (!session?.accessToken) {
      throw new Error('Missing authenticated client context');
    }

    const data = await backendRequest('/api/modules', {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      cacheMode: 'no-store',
    });
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json({ success: false, message: apiError.message, details: apiError.details }, { status: apiError.status });
  }
}