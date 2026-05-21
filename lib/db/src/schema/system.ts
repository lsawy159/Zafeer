import {
  pgTable, uuid, text, bigint, numeric, boolean, timestamp, jsonb, integer,
} from 'drizzle-orm/pg-core'
import { emailStatusEnum, emailPriorityEnum } from './enums'

// ─── system_settings ──────────────────────────────────────────────────────────

export const systemSettingsTable = pgTable('system_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  setting_key: text('setting_key').notNull().unique(),
  setting_value: jsonb('setting_value').notNull(),
  maintenance_until: timestamp('maintenance_until', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export type SystemSetting = typeof systemSettingsTable.$inferSelect

// ─── email_queue ──────────────────────────────────────────────────────────────

export const emailQueueTable = pgTable('email_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  to_emails: text('to_emails').array().notNull(),
  cc_emails: text('cc_emails').array(),
  bcc_emails: text('bcc_emails').array(),
  subject: text('subject').notNull(),
  html_content: text('html_content'),
  text_content: text('text_content'),
  status: emailStatusEnum('status').notNull().default('pending'),
  priority: emailPriorityEnum('priority').notNull().default('medium'),
  scheduled_at: timestamp('scheduled_at', { withTimezone: true }),
  sent_at: timestamp('sent_at', { withTimezone: true }),
  processed_at: timestamp('processed_at', { withTimezone: true }),
  completed_at: timestamp('completed_at', { withTimezone: true }),
  retries: numeric('retries').notNull().default('0'),
  retry_count: numeric('retry_count').notNull().default('0'),
  last_attempt: timestamp('last_attempt', { withTimezone: true }),
  error_message: text('error_message'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type EmailQueue = typeof emailQueueTable.$inferSelect

// ─── backup_history ───────────────────────────────────────────────────────────

export const backupHistoryTable = pgTable('backup_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  backup_type: text('backup_type').notNull(),
  triggered_by: uuid('triggered_by'),
  file_path: text('file_path'),
  file_size: bigint('file_size', { mode: 'number' }),
  compression_ratio: numeric('compression_ratio'),
  status: text('status').default('pending'),
  started_at: timestamp('started_at', { withTimezone: true }).defaultNow(),
  completed_at: timestamp('completed_at', { withTimezone: true }),
  error_message: text('error_message'),
  tables_included: text('tables_included').array(),
  table_record_counts: jsonb('table_record_counts'),
})

export type BackupHistory = typeof backupHistoryTable.$inferSelect

// ─── restore_history ──────────────────────────────────────────────────────────

export const restoreHistoryTable = pgTable('restore_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  backup_id: uuid('backup_id').notNull().references(() => backupHistoryTable.id),
  executed_by: uuid('executed_by').notNull(),
  snapshot_id: uuid('snapshot_id').references(() => backupHistoryTable.id),
  // status state machine: pending→creating_snapshot→reading_file→staging_data→restoring_data→completed|failed
  status: text('status').notNull().default('pending'),
  started_at: timestamp('started_at', { withTimezone: true }).defaultNow(),
  completed_at: timestamp('completed_at', { withTimezone: true }),
  tables_restored: integer('tables_restored'),
  records_restored: integer('records_restored'),
  error_message: text('error_message'),
  notes: text('notes'),
})

export type RestoreHistory = typeof restoreHistoryTable.$inferSelect

// ─── restore_staging ─────────────────────────────────────────────────────────

export const restoreStagingTable = pgTable('restore_staging', {
  id: uuid('id').primaryKey().defaultRandom(),
  session_id: uuid('session_id').notNull(),
  table_name: text('table_name').notNull(),
  data: jsonb('data').notNull(),
  chunk_index: integer('chunk_index').notNull().default(0),
  chunk_total: integer('chunk_total').notNull().default(1),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export type RestoreStaging = typeof restoreStagingTable.$inferSelect
