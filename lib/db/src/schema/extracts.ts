import {
  pgTable,
  pgEnum,
  uuid,
  text,
  numeric,
  integer,
  date,
  timestamp,
  bigint,
} from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod/v4'
import { projectsTable } from './projects'
import { employeesTable } from './employees'
import { usersTable } from './users'

// ─── extract_status_enum ──────────────────────────────────────────────────────

export const extractStatusEnum = pgEnum('extract_status_enum', ['draft', 'exported'])

// ─── project_job_title_rates ──────────────────────────────────────────────────

export const projectJobTitleRatesTable = pgTable('project_job_title_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id')
    .notNull()
    .references(() => projectsTable.id, { onDelete: 'cascade' }),
  profession: text('profession').notNull(),
  monthly_rate: numeric('monthly_rate', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const insertProjectJobTitleRateSchema = createInsertSchema(projectJobTitleRatesTable)
export const selectProjectJobTitleRateSchema = createSelectSchema(projectJobTitleRatesTable)
export type InsertProjectJobTitleRate = z.infer<typeof insertProjectJobTitleRateSchema>
export type ProjectJobTitleRate = typeof projectJobTitleRatesTable.$inferSelect

// ─── extract_invoices ─────────────────────────────────────────────────────────

export const extractInvoicesTable = pgTable('extract_invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  project_id: uuid('project_id')
    .notNull()
    .references(() => projectsTable.id, { onDelete: 'restrict' }),
  period_month: date('period_month').notNull(),
  version: integer('version').notNull().default(1),
  status: extractStatusEnum('status').notNull().default('draft'),
  total_amount: numeric('total_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  employee_count: integer('employee_count').notNull().default(0),
  total_days_in_month: integer('total_days_in_month').notNull(),
  created_by: uuid('created_by')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'restrict' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  exported_at: timestamp('exported_at', { withTimezone: true }),
})

export const insertExtractInvoiceSchema = createInsertSchema(extractInvoicesTable)
export const selectExtractInvoiceSchema = createSelectSchema(extractInvoicesTable)
export type InsertExtractInvoice = z.infer<typeof insertExtractInvoiceSchema>
export type ExtractInvoice = typeof extractInvoicesTable.$inferSelect

// ─── extract_invoice_lines ────────────────────────────────────────────────────

export const extractInvoiceLinesTable = pgTable('extract_invoice_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoice_id: uuid('invoice_id')
    .notNull()
    .references(() => extractInvoicesTable.id, { onDelete: 'cascade' }),
  employee_id: uuid('employee_id').references(() => employeesTable.id, {
    onDelete: 'set null',
  }),
  employee_name_snapshot: text('employee_name_snapshot').notNull(),
  residence_number_snapshot: bigint('residence_number_snapshot', { mode: 'number' }).notNull(),
  profession_snapshot: text('profession_snapshot').notNull(),
  monthly_rate_snapshot: numeric('monthly_rate_snapshot', { precision: 10, scale: 2 }).notNull(),
  attendance_days: integer('attendance_days').notNull(),
  total_days_in_month: integer('total_days_in_month').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const insertExtractInvoiceLineSchema = createInsertSchema(extractInvoiceLinesTable)
export const selectExtractInvoiceLineSchema = createSelectSchema(extractInvoiceLinesTable)
export type InsertExtractInvoiceLine = z.infer<typeof insertExtractInvoiceLineSchema>
export type ExtractInvoiceLine = typeof extractInvoiceLinesTable.$inferSelect
