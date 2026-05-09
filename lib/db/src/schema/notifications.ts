import {
  pgTable, uuid, text, integer, boolean, date, timestamp, bigint, jsonb,
} from 'drizzle-orm/pg-core'
import { createInsertSchema } from 'drizzle-zod'
import { z } from 'zod/v4'
import { employeesTable } from './employees'
import { companiesTable } from './companies'

// ─── notifications ────────────────────────────────────────────────────────────

export const notificationsTable = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message'),
  entity_type: text('entity_type'),
  entity_id: uuid('entity_id'),
  priority: text('priority').default('medium'),
  days_remaining: integer('days_remaining'),
  is_read: boolean('is_read').default(false),
  is_archived: boolean('is_archived').default(false),
  target_date: date('target_date'),
  read_at: timestamp('read_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const insertNotificationSchema = createInsertSchema(notificationsTable)
export type InsertNotification = z.infer<typeof insertNotificationSchema>
export type Notification = typeof notificationsTable.$inferSelect

// ─── read_alerts ──────────────────────────────────────────────────────────────

export const readAlertsTable = pgTable('read_alerts', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  user_id: uuid('user_id').notNull(),
  alert_id: text('alert_id').notNull(),
  read_at: timestamp('read_at', { withTimezone: true }).notNull().defaultNow(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type ReadAlert = typeof readAlertsTable.$inferSelect

// ─── daily_alert_logs ─────────────────────────────────────────────────────────

export const dailyAlertLogsTable = pgTable('daily_alert_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  employee_id: uuid('employee_id').references(() => employeesTable.id),
  company_id: uuid('company_id').references(() => companiesTable.id),
  alert_type: text('alert_type').notNull(),
  priority: text('priority').default('medium'),
  title: text('title'),
  message: text('message'),
  details: jsonb('details').default({}),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  processed_at: timestamp('processed_at', { withTimezone: true }),
})

export type DailyAlertLog = typeof dailyAlertLogsTable.$inferSelect

// ─── daily_excel_logs ─────────────────────────────────────────────────────────

export const dailyExcelLogsTable = pgTable('daily_excel_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  alert_type: text('alert_type').notNull(),
  priority: text('priority').default('medium'),
  message: text('message'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  processed_at: timestamp('processed_at', { withTimezone: true }),
})

export type DailyExcelLog = typeof dailyExcelLogsTable.$inferSelect
