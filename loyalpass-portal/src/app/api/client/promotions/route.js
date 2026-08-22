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
  if (!session?.businessId || !session?.apiKey) throw new Error('Missing authenticated client context');
  return { businessId: session.businessId, apiKey: session.apiKey };
}

async function handle(request, method) {
  try {
    const { businessId, apiKey } = await getClientCredentials();
    const payload = method === 'GET' ? undefined : await request.json();
    const promotionId = method === 'PUT' || method === 'POST' ? payload?.promotionId : null;
    const path = method === 'GET' ? '/api/promotions' : promotionId ? `/api/promotions/${promotionId}` : '/api/promotions';
    const body = promotionId ? payload?.updates || payload : payload;
    const data = await backendRequest(path, {
      method,
      apiKey,
      body,
      cacheMode: method === 'GET' ? 'force-cache' : undefined,
      revalidate: 20,
      tags: [`promotions:${businessId}`],
      headers: payload?.idempotencyKey ? { 'Idempotency-Key': payload.idempotencyKey } : undefined,
    });
    revalidateTag(`promotions:${businessId}`);
    return NextResponse.json(data, { status: method === 'POST' ? 201 : 200 });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json({ success: false, message: apiError.message, details: apiError.details }, { status: apiError.status });
  }
}

export async function GET(request) { return handle(request, 'GET'); }
export async function POST(request) { return handle(request, 'POST'); }
export async function PUT(request) { return handle(request, 'PUT'); }