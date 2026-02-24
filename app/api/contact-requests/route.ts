import { NextRequest, NextResponse } from 'next/server';
import { connectMongoose } from '@/lib/mongoose';
import ContactRequest from '@/models/ContactRequest';
import { checkRateLimit } from '@/lib/rateLimit';
import { getCorsHeaders, handleCorsPreFlight } from '@/lib/cors';
import emailService from '@/services/emailService';

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

  try {
    const identifier = req.headers.get('x-forwarded-for') || 'anonymous-contact';
    const allowed = checkRateLimit(`contact-form:${identifier}`, 8, 60 * 60 * 1000);

    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429, headers: corsHeaders }
      );
    }

    const body = await req.json();
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
      emailService.sendNewContactLeadNotificationToAdmin(emailData),
      emailService.sendContactLeadAcknowledgementToUser(emailData)
    ]).catch(() => undefined);

    return NextResponse.json(
      {
        success: true,
        request: {
          requestId: contactRequest.requestId,
          status: contactRequest.status,
          createdAt: contactRequest.createdAt
        },
        message: 'Your request has been received. Our team will call you within 24 business hours.'
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to submit contact request', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}