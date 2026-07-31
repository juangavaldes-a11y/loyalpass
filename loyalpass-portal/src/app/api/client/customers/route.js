import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { cookies } from 'next/headers';
import { backendRequest } from '@/lib/api/backend';
import { toApiError } from '@/lib/api/errors';
import { getSessionCookieName, verifySessionToken } from '@/lib/auth/session';

async function getClientCredentials() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  const session = await verifySessionToken(token);

  if (!session?.businessId || !session?.apiKey) {
    throw new Error('Missing authenticated client context');
  }

  return {
    businessId: session.businessId,
    apiKey: session.apiKey,
  };
}

export async function GET(request) {
  try {
    const { businessId, apiKey } = await getClientCredentials();
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    const path = customerId ? `/api/customers/${customerId}` : '/api/customers';

    const data = await backendRequest(path, {
      apiKey,
      cacheMode: 'force-cache',
      revalidate: 30,
      tags: [`customers:${businessId}`],
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

export async function POST(request) {
  try {
    const { businessId, apiKey } = await getClientCredentials();
    const payload = await request.json();

    const data = await backendRequest('/api/customers', {
      method: 'POST',
      body: payload,
      apiKey,
    });

    revalidateTag(`customers:${businessId}`);

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { success: false, message: apiError.message, details: apiError.details },
      { status: apiError.status }
    );
  }
}

export async function PUT(request) {
  try {
    const { businessId, apiKey } = await getClientCredentials();
    const payload = await request.json();
    const { customerId, updates } = payload;

    if (!customerId) {
      return NextResponse.json(
        {
          success: false,
          message: 'customerId is required',
        },
        { status: 400 }
      );
    }

    const data = await backendRequest(`/api/customers/${customerId}`, {
      method: 'PUT',
      body: updates || {},
      apiKey,
    });

    revalidateTag(`customers:${businessId}`);

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { success: false, message: apiError.message, details: apiError.details },
      { status: apiError.status }
    );
  }
}
