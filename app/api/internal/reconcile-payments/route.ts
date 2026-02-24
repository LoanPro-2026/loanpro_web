export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { runPaymentReconciliation } from '@/services/paymentReconciliationService';
import { logger } from '@/lib/logger';

function isAuthorized(request: Request) {
  const secret = process.env.PAYMENT_RECONCILIATION_SECRET || process.env.CRON_SECRET;

  if (!secret) {
    return process.env.NODE_ENV !== 'production';
  }

  const bearer = request.headers.get('authorization');
  const internalSecret = request.headers.get('x-internal-secret');
  const expectedBearer = `Bearer ${secret}`;

  return bearer === expectedBearer || internalSecret === secret;
}

export async function GET(request: Request) {
  const start = Date.now();

  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit') || '100');
    const minPendingMinutes = Number(url.searchParams.get('minPendingMinutes') || '2');
    const staleMinutes = Number(url.searchParams.get('staleMinutes') || '30');

    const result = await runPaymentReconciliation({
      source: 'internal-cron',
      limit,
      minPendingMinutes,
      staleMinutes,
    });

    return NextResponse.json({
      success: true,
      result,
      durationMs: Date.now() - start,
    });
  } catch (error) {
    logger.error('Internal payment reconciliation failed', error as Error, 'PAYMENT_RECONCILIATION');
    return NextResponse.json(
      { success: false, error: 'Internal reconciliation failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
