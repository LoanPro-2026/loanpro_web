import { connectToDatabase } from '@/lib/mongodb';

interface AuditLogInput {
  actorEmail: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, unknown>;
}

export async function writeAdminAuditLog(input: AuditLogInput) {
  try {
    const { db } = await connectToDatabase();
    await db.collection('admin_audit_logs').insertOne({
      actorEmail: input.actorEmail,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId || null,
      details: input.details || {},
      createdAt: new Date(),
    });
  } catch {
    // Intentionally swallow audit write failures to avoid breaking primary admin operations.
  }
}
