import { NextRequest, NextResponse } from 'next/server';
import { connectMongoose } from '@/lib/mongoose';
import ContactRequest from '@/models/ContactRequest';
import { getCorsHeaders, handleCorsPreFlight } from '@/lib/cors';
import emailService from '@/services/emailService';
import { logger } from '@/lib/logger';
import { enforceRequestRateLimit, parseJsonRequest, toSafeErrorResponse } from '@/lib/apiSafety';

export async function OPTIONS(req: NextRequest) {
  return handleCorsPreFlight(req);
}

const VALID_INQUIRY_TYPES = ['sales', 'demo-request', 'pricing', 'application-setup', 'partnership', 'other'];

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string) {
  return /^[+]?[-()\d\s]{7,20}$/.test(phone);
}

export async function POST(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);
  const applyCors = (response: NextResponse) => {
    Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value));
    return response;
  };

  try {
    const rateLimitResponse = enforceRequestRateLimit({
      request: req,
      scope: 'contact-form',
      limit: 8,
      windowMs: 60 * 60 * 1000,
    });

    if (rateLimitResponse) {
      return applyCors(rateLimitResponse);
    }

    const parsedBody = await parseJsonRequest<Record<string, unknown>>(req, { maxBytes: 64 * 1024 });
    if (!parsedBody.ok) {
      return applyCors(parsedBody.response);
    }

    const body = parsedBody.data;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const organization = typeof body.organization === 'string' ? body.organization.trim() : '';
    const inquiryType = typeof body.inquiryType === 'string' ? body.inquiryType.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const preferredCallbackTime = typeof body.preferredCallbackTime === 'string' ? body.preferredCallbackTime.trim() : '';
    const timezone = typeof body.timezone === 'string' ? body.timezone.trim() : '';
    const consentAccepted = body.consentAccepted === true;

    if (!name || !email || !phone || !organization || !inquiryType || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!isValidPhone(phone)) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!VALID_INQUIRY_TYPES.includes(inquiryType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid inquiry type' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!consentAccepted) {
      return NextResponse.json(
        { success: false, error: 'Consent is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    await connectMongoose();

    const contactRequest = new ContactRequest({
      name,
      email,
      phone,
      organization,
      inquiryType,
      message,
      preferredCallbackTime: preferredCallbackTime || undefined,
      timezone: timezone || undefined,
      consentAccepted,
      consentAt: new Date(),
      source: 'website_contact_form',
      status: 'new',
      priority: 'normal'
    });

    await contactRequest.save();

    const emailData = {
      requestId: contactRequest.requestId,
      name,
      email,
      phone,
      organization,
      inquiryType,
      message,
      preferredCallbackTime: preferredCallbackTime || undefined,
      timezone: timezone || undefined,
      createdAt: contactRequest.createdAt
    };

    Promise.all([
      emailService.sendContactRequestToContactInbox(emailData),
      emailService.sendContactAcknowledgementFromAdmin(emailData)
    ]).catch((err) => logger.warn('Contact lead email delivery failed', 'CONTACT_REQUESTS', {
      requestId: contactRequest.requestId,
      error: err instanceof Error ? err.message : 'unknown',
    }));

    return NextResponse.json(
      {
        success: true,
        request: {
          requestId: contactRequest.requestId,
          status: contactRequest.status,
          createdAt: contactRequest.createdAt
        },
        message: 'Thank you for submitting your request. Our team will get in touch with you as soon as possible.'
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (error: any) {
    logger.error('Failed to submit contact request', error, 'CONTACT_REQUESTS');
    return applyCors(toSafeErrorResponse(error, 'CONTACT_REQUESTS', 'Failed to submit contact request'));
  }
}