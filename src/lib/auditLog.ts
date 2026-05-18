import { createClient } from '@/lib/supabase/client';

export interface AuditLogEntry {
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  action: string;
  beforeValues?: Record<string, any>;
  afterValues?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Logs an entity change to the audit_logs table.
 * Silently fails to avoid blocking the main operation.
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('audit_logs').insert({
      entity_type: entry.entityType,
      entity_id: entry.entityId || null,
      entity_label: entry.entityLabel || null,
      action: entry.action,
      performed_by: user?.id || null,
      performed_by_email: user?.email || null,
      before_values: entry.beforeValues || null,
      after_values: entry.afterValues || null,
      metadata: entry.metadata || null,
    });
  } catch {
    // Audit logging must never block the main operation
  }
}

/**
 * Computes a diff between before and after objects, returning only changed keys.
 */
export function computeDiff(
  before: Record<string, any>,
  after: Record<string, any>
): { before: Record<string, any>; after: Record<string, any> } {
  const changedBefore: Record<string, any> = {};
  const changedAfter: Record<string, any> = {};

  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of allKeys) {
    const bVal = before[key];
    const aVal = after[key];
    if (JSON.stringify(bVal) !== JSON.stringify(aVal)) {
      changedBefore[key] = bVal;
      changedAfter[key] = aVal;
    }
  }

  return { before: changedBefore, after: changedAfter };
}
