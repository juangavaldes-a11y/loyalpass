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

    const data = await backendRequest(`/api/passes/${customerId}`, {
      apiKey,
      cacheMode: 'force-cache',
      revalidate: 20,
      tags: [`passes:${businessId}`],
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
    const { action, customerId, passId } = payload;

    let data;

    if (action === 'update') {
      if (!customerId || !passId) {
        return NextResponse.json(
          { success: false, message: 'customerId and passId are required for update' },
          { status: 400 }
        );
      }

      data = await backendRequest('/api/passes/update', {
        method: 'POST',
        apiKey,
        body: {
          customer_id: customerId,
          pass_id: passId,
        },
      });
    } else {
      if (!customerId) {
        return NextResponse.json(
          { success: false, message: 'customerId is required for create' },
          { status: 400 }
        );
      }

      data = await backendRequest('/api/passes/create', {
        method: 'POST',
        apiKey,
        body: {
          customer_id: customerId,
        },
      });
    }

    revalidateTag(`passes:${businessId}`);

    return NextResponse.json(data, { status: action === 'update' ? 200 : 201 });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { success: false, message: apiError.message, details: apiError.details },
      { status: apiError.status }
    );
  }
}
