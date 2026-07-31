import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { cookies } from 'next/headers';
import { backendRequest } from '@/lib/api/backend';
import { toApiError } from '@/lib/api/errors';
import { getSessionCookieName, verifySessionToken } from '@/lib/auth/session';

async function getClientCredentialsFromSession() {
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
    const { businessId, apiKey } = await getClientCredentialsFromSession();
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json(
        { success: false, message: 'customerId is required' },
        { status: 400 }
      );
    }

    const data = await backendRequest(`/api/points/${customerId}`, {
      apiKey,
      cacheMode: 'force-cache',
      revalidate: 20,
      tags: [`points:${businessId}`],
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
    const { businessId, apiKey } = await getClientCredentialsFromSession();
    const payload = await request.json();
    const { action, customerId, amount } = payload;

    if (!action || !customerId || amount === undefined) {
      return NextResponse.json(
        { success: false, message: 'action, customerId, and amount are required' },
        { status: 400 }
      );
    }

    const endpoint = action === 'redeem' ? '/api/points/redeem' : '/api/points/add';

    const data = await backendRequest(endpoint, {
      method: 'POST',
      apiKey,
      body: {
        customer_id: customerId,
        amount,
      },
    });

    revalidateTag(`points:${businessId}`);
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
