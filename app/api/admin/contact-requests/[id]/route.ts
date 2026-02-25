import { NextRequest, NextResponse } from 'next/server';
import { connectMongoose } from '@/lib/mongoose';
import ContactRequest from '@/models/ContactRequest';
import { enforceAdminAccess, getAdminErrorStatus } from '@/lib/adminAuth';
import { getAdminCachedResponse, invalidateAdminCacheByTags, setAdminCachedResponse } from '@/lib/adminResponseCache';

const VALID_STATUSES = ['new', 'called', 'follow-up', 'converted', 'closed'];
const VALID_PRIORITIES = ['normal', 'high'];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await enforceAdminAccess(req, {
      permission: 'leads:read',
      rateLimitKey: 'leads:detail:get',
      limit: 100,
      windowMs: 60_000,
    });

    const { id } = await params;
    const cacheKey = `admin:leads:detail:v1:${id}`;
    const cached = getAdminCachedResponse<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    await connectMongoose();

    const lead = await ContactRequest.findOne({ requestId: id }).lean();

    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Lead not found' },
        { status: 404 }
      );
    }

    const payload = { success: true, lead };
    setAdminCachedResponse(cacheKey, payload, 15_000, ['leads']);

    return NextResponse.json(payload);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lead', details: error.message },
      { status: getAdminErrorStatus(error) }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await enforceAdminAccess(req, {
      permission: 'leads:write',
      rateLimitKey: 'leads:detail:patch',
      limit: 60,
      windowMs: 60_000,
    });

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

    invalidateAdminCacheByTags(['leads']);

    return NextResponse.json({ success: true, lead });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to update lead', details: error.message },
      { status: getAdminErrorStatus(error) }
    );
  }
}