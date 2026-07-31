import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { backendRequest } from '@/lib/api/backend';
import { toApiError } from '@/lib/api/errors';
import { getSessionCookieName, verifySessionToken } from '@/lib/auth/session';
import { validateRequiredBusinessId } from '../routeUtils';

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
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId');

    const { error } = validateRequiredBusinessId({ businessId });
    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: error.status }
      );
    }

    const data = await backendRequest(`/api/businesses/${businessId}/quota-status`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { success: false, message: apiError.message, details: apiError.details },
      { status: apiError.status }
    );
  }
}
