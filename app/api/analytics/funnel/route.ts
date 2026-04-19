export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { enforceRequestRateLimit, parseJsonRequest, toSafeErrorResponse } from '@/lib/apiSafety';

const ALLOWED_EVENTS = new Set([
  'page_view',
  'agent_widget_opened',
  'agent_call_clicked',
  'lead_submitted',
  'pricing_discussion_clicked',
  'checkout_started',
  'support_form_opened',
  'support_form_submitted',
]);

export async function POST(req: Request) {
  try {
    const rateLimitResponse = enforceRequestRateLimit({
      request: req,
      scope: 'analytics-funnel',
      limit: 180,
      windowMs: 60 * 1000,
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const parsedBody = await parseJsonRequest<Record<string, any>>(req, { maxBytes: 48 * 1024 });
    if (!parsedBody.ok) {
      return parsedBody.response;
    }

    const body = parsedBody.data;
    const eventName = String(body?.eventName || '').trim();
    const visitorId = String(body?.visitorId || '').trim();
    const pagePath = String(body?.pagePath || '').trim() || '/';

    if (!eventName || !ALLOWED_EVENTS.has(eventName)) {
      return NextResponse.json({ success: false, error: 'Invalid eventName' }, { status: 400 });
    }

    if (!visitorId) {
      return NextResponse.json({ success: false, error: 'visitorId is required' }, { status: 400 });
    }

    const payload = body?.payload && typeof body.payload === 'object' ? body.payload : {};
    const utm = body?.utm && typeof body.utm === 'object' ? body.utm : {};

    const { db } = await connectToDatabase();
    await db.collection('sales_funnel_events').insertOne({
      eventName,
      visitorId,
      pagePath,
      referrer: typeof body?.referrer === 'string' ? body.referrer : null,
      utm,
      payload,
      occurredAt: body?.occurredAt ? new Date(body.occurredAt) : new Date(),
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return toSafeErrorResponse(error, 'ANALYTICS_FUNNEL', 'Unable to process analytics event');
  }
}
