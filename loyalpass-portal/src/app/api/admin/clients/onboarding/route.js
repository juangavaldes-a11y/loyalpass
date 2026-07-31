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

export async function POST(request) {
  try {
    const session = await getAdminSession();
    const payload = await request.json();
    const { businessId, payload: onboardingPayload } = payload;

    if (!businessId) {
      return NextResponse.json(
        {
          success: false,
          message: 'businessId is required',
        },
        { status: 400 }
      );
    }

    const data = await backendRequest(`/api/businesses/${businessId}/onboarding`, {
      method: 'POST',
      body: onboardingPayload || {},
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    revalidateTag(`business:${businessId}`);
    revalidateTag('admin:clients');

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { success: false, message: apiError.message, details: apiError.details },
      { status: apiError.status }
    );
  }
}
