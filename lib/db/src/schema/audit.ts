import {
  pgTable, uuid, text, integer, boolean, timestamp, jsonb,
} from 'drizzle-orm/pg-core'

// ─── activity_log ─────────────────────────────────────────────────────────────

export const activityLogTable = pgTable('activity_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id'),
  entity_type: text('entity_type'),
  entity_id: uuid('entity_id'),
  action: text('action').notNull(),
  details: jsonb('details').default({}),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export type ActivityLog = typeof activityLogTable.$inferSelect

// ─── audit_log ────────────────────────────────────────────────────────────────

export const auditLogTable = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id'),
  action: text('action').notNull(),
  table_name: text('table_name'),
  record_id: text('record_id'),
  old_data: jsonb('old_data'),
  new_data: jsonb('new_data'),
  ip_address: text('ip_address'),
  user_agent: text('user_agent'),
  entity_type: text('entity_type'),
  entity_id: text('entity_id'),
  details: jsonb('details').default({}),
  session_id: text('session_id'),
  operation: text('operation'),
  operation_status: text('operation_status'),
  affected_rows: integer('affected_rows'),
  action_type: text('action_type'),
  status: text('status'),
  resource_type: text('resource_type'),
  resource_id: text('resource_id'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type AuditLog = typeof auditLogTable.$inferSelect

// ─── security_events ──────────────────────────────────────────────────────────

export const securityEventsTable = pgTable('security_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id'),
  event_type: text('event_type').notNull(),
  details: jsonb('details'),
  ip_address: text('ip_address'),
  user_agent: text('user_agent'),
  severity: text('severity'),
  description: text('description'),
  source_ip: text('source_ip'),
  is_resolved: boolean('is_resolved').default(false),
  resolved_by: uuid('resolved_by'),
  resolved_at: timestamp('resolved_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type SecurityEvent = typeof securityEventsTable.$inferSelect
