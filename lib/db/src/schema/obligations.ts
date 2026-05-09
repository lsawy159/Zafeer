import {
  pgTable, uuid, text, numeric, date, timestamp, boolean, smallint, integer,
  char,
} from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod/v4'
import { employeesTable } from './employees'
import { usersTable } from './users'
import {
  obligationTypeEnum,
  obligationPlanStatusEnum,
  obligationLineStatusEnum,
} from './enums'

// ─── employee_obligation_headers ─────────────────────────────────────────────

export const obligationHeadersTable = pgTable('employee_obligation_headers', {
  id: uuid('id').primaryKey().defaultRandom(),
  employee_id: uuid('employee_id').notNull().references(() => employeesTable.id),
  obligation_type: obligationTypeEnum('obligation_type').notNull(),
  title: text('title').notNull(),
  total_amount: numeric('total_amount').notNull(),
  currency_code: char('currency_code', { length: 3 }).notNull().default('SAR'),
  start_month: date('start_month').notNull(),
  installment_count: smallint('installment_count').notNull(),
  status: obligationPlanStatusEnum('status').notNull().default('draft'),
  created_by_user_id: uuid('created_by_user_id').references(() => usersTable.id),
  superseded_by_header_id: uuid('superseded_by_header_id'),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const insertObligationHeaderSchema = createInsertSchema(obligationHeadersTable)
export const selectObligationHeaderSchema = createSelectSchema(obligationHeadersTable)
export type InsertObligationHeader = z.infer<typeof insertObligationHeaderSchema>
export type ObligationHeader = typeof obligationHeadersTable.$inferSelect

// ─── employee_obligation_lines ───────────────────────────────────────────────

export const obligationLinesTable = pgTable('employee_obligation_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  header_id: uuid('header_id').notNull().references(() => obligationHeadersTable.id),
  employee_id: uuid('employee_id').notNull().references(() => employeesTable.id),
  due_month: date('due_month').notNull(),
  amount_due: numeric('amount_due').notNull(),
  amount_paid: numeric('amount_paid').notNull().default('0.00'),
  line_status: obligationLineStatusEnum('line_status').notNull().default('unpaid'),
  source_version: integer('source_version').notNull().default(1),
  manual_override: boolean('manual_override').notNull().default(false),
  override_reason: text('override_reason'),
  rescheduled_from_line_id: uuid('rescheduled_from_line_id'),
  rescheduled_to_line_id: uuid('rescheduled_to_line_id'),
  payroll_entry_id: uuid('payroll_entry_id'),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const insertObligationLineSchema = createInsertSchema(obligationLinesTable)
export const selectObligationLineSchema = createSelectSchema(obligationLinesTable)
export type InsertObligationLine = z.infer<typeof insertObligationLineSchema>
export type ObligationLine = typeof obligationLinesTable.$inferSelect
