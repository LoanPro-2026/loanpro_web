import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { connectMongoose } from '@/lib/mongoose';
import ContactRequest from '@/models/ContactRequest';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'your-admin-email@gmail.com';

async function verifyAdmin() {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const userResponse = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` }
  });
  const user = await userResponse.json();
  const userEmail = user.email_addresses[0]?.email_address;

  if (userEmail !== ADMIN_EMAIL) throw new Error('Access denied');
  return userEmail;
}

const VALID_STATUSES = ['new', 'called', 'follow-up', 'converted', 'closed'];
const VALID_PRIORITIES = ['normal', 'high'];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdmin();

    const { id } = await params;
    await connectMongoose();

    const lead = await ContactRequest.findOne({ requestId: id }).lean();

    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, lead });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lead', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdmin();

    const { id } = await params;
    const body = await req.json();

    await connectMongoose();

    const lead = await ContactRequest.findOne({ requestId: id });
    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }

    const updates: any = { updatedAt: new Date() };

    if (typeof body.status === 'string') {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json(
          { success: false, error: 'Invalid status value' },
          { status: 400 }
        );
      }
      updates.status = body.status;

      if (body.status === 'called') {
        updates.lastCalledAt = new Date();
        if (!lead.firstCalledAt) {
          updates.firstCalledAt = new Date();
        }
      }
    }

    if (typeof body.priority === 'string') {
      if (!VALID_PRIORITIES.includes(body.priority)) {
        return NextResponse.json(
          { success: false, error: 'Invalid priority value' },
          { status: 400 }
        );
      }
      updates.priority = body.priority;
    }

    if (typeof body.assignedTo === 'string') {
      updates.assignedTo = body.assignedTo.trim() || undefined;
    }

    if (typeof body.nextFollowUpAt === 'string' && body.nextFollowUpAt.trim()) {
      const parsedDate = new Date(body.nextFollowUpAt);
      if (!Number.isNaN(parsedDate.getTime())) {
        updates.nextFollowUpAt = parsedDate;
      }
    }

    if (typeof body.callNote === 'string' && body.callNote.trim()) {
      const noteBy = typeof body.noteBy === 'string' && body.noteBy.trim()
        ? body.noteBy.trim()
        : 'Support Team';
      lead.callNotes.push({
        note: body.callNote.trim(),
        by: noteBy,
        createdAt: new Date()
      });
    }

    Object.assign(lead, updates);
    await lead.save();

    return NextResponse.json({ success: true, lead });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to update lead', details: error.message },
      { status: 500 }
    );
  }
}