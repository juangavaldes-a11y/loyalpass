import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { cookies } from 'next/headers';
import { backendRequest } from '@/lib/api/backend';
import { toApiError } from '@/lib/api/errors';
import { getSessionCookieName, verifySessionToken } from '@/lib/auth/session';

async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  const session = await verifySessionToken(token);

  if (!session?.accessToken || session.role !== 'platform_admin') {
    throw new Error('Missing authenticated admin context');
  }

  return session;
}

export async function GET(request) {
  try {
    const session = await getAdminSession();
    const businessId = new URL(request.url).searchParams.get('businessId');
    if (!businessId) {
      return NextResponse.json({ success: false, message: 'businessId is required' }, { status: 400 });
    }

    const data = await backendRequest(`/api/businesses/${businessId}/modules`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      cacheMode: 'no-store',
    });
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json({ success: false, message: apiError.message, details: apiError.details }, { status: apiError.status });
  }
}

export async function PUT(request) {
  try {
    const session = await getAdminSession();
    const { businessId, moduleKey, enabled, reason } = await request.json();
    if (!businessId || !moduleKey || typeof enabled !== 'boolean') {
      return NextResponse.json({ success: false, message: 'businessId, moduleKey, and enabled are required' }, { status: 400 });
    }

    const data = await backendRequest(`/api/businesses/${businessId}/modules/${moduleKey}`, {
      method: 'PUT',
      body: { enabled, reason },
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    revalidateTag(`business:${businessId}`);
    revalidateTag('admin:clients');
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json({ success: false, message: apiError.message, details: apiError.details }, { status: apiError.status });
  }
}