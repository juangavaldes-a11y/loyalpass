import { NextResponse } from 'next/server';
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

export async function GET() {
  try {
    const { businessId, apiKey } = await getClientCredentials();

    const data = await backendRequest(`/api/businesses/${businessId}`, {
      apiKey,
      cacheMode: 'force-cache',
      revalidate: 30,
      tags: [`business:${businessId}`],
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
