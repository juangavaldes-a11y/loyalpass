import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { backendRequest } from '@/lib/api/backend';
import { toApiError } from '@/lib/api/errors';
import { getSessionCookieName, verifySessionToken } from '@/lib/auth/session';

async function getClientSession() {
  const session = await verifySessionToken((await cookies()).get(getSessionCookieName())?.value);
  if (!session?.businessId || !session?.accessToken) throw new Error('Missing authenticated client context');
  return session;
}

export async function GET() {
  try {
    const session = await getClientSession();
    const data = await backendRequest(`/api/businesses/${session.businessId}/team`, { headers: { Authorization: `Bearer ${session.accessToken}` }, cacheMode: 'no-store' });
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json({ success: false, message: apiError.message }, { status: apiError.status });
  }
}

export async function PUT(request) {
  try {
    const session = await getClientSession();
    const { userId, ...updates } = await request.json();
    if (!userId) return NextResponse.json({ success: false, message: 'userId is required' }, { status: 400 });
    const data = await backendRequest(`/api/businesses/${session.businessId}/team/${userId}`, { method: 'PUT', body: updates, headers: { Authorization: `Bearer ${session.accessToken}` } });
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json({ success: false, message: apiError.message }, { status: apiError.status });
  }
}