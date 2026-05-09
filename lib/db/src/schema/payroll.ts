import {
  pgTable, uuid, text, numeric, date, timestamp, jsonb,
} from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod/v4'
import { employeesTable } from './employees'
import { usersTable } from './users'
import { obligationLinesTable } from './obligations'
import {
  payrollScopeTypeEnum,
  payrollInputModeEnum,
  payrollRunStatusEnum,
  payrollEntryStatusEnum,
  payrollComponentTypeEnum,
} from './enums'

// ─── payroll_runs ─────────────────────────────────────────────────────────────

export const payrollRunsTable = pgTable('payroll_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  payroll_month: date('payroll_month').notNull(),
  scope_type: payrollScopeTypeEnum('scope_type').notNull(),
  scope_id: uuid('scope_id').notNull(),
  input_mode: payrollInputModeEnum('input_mode').notNull().default('manual'),
  status: payrollRunStatusEnum('status').notNull().default('draft'),
  uploaded_file_path: text('uploaded_file_path'),
  notes: text('notes'),
  created_by_user_id: uuid('created_by_user_id').references(() => usersTable.id),
  approved_by_user_id: uuid('approved_by_user_id').references(() => usersTable.id),
  approved_at: timestamp('approved_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const insertPayrollRunSchema = createInsertSchema(payrollRunsTable)
export const selectPayrollRunSchema = createSelectSchema(payrollRunsTable)
export type InsertPayrollRun = z.infer<typeof insertPayrollRunSchema>
export type PayrollRun = typeof payrollRunsTable.$inferSelect

// ─── payroll_entries ─────────────────────────────────────────────────────────

export const payrollEntriesTable = pgTable('payroll_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  payroll_run_id: uuid('payroll_run_id').notNull().references(() => payrollRunsTable.id),
  employee_id: uuid('employee_id').notNull().references(() => employeesTable.id),
  residence_number_snapshot: numeric('residence_number_snapshot').notNull(),
  employee_name_snapshot: text('employee_name_snapshot').notNull(),
  company_name_snapshot: text('company_name_snapshot'),
  project_name_snapshot: text('project_name_snapshot'),
  basic_salary_snapshot: numeric('basic_salary_snapshot').notNull(),
  daily_rate_snapshot: numeric('daily_rate_snapshot').notNull(),
  attendance_days: numeric('attendance_days').notNull().default('0.00'),
  paid_leave_days: numeric('paid_leave_days').notNull().default('0.00'),
  overtime_amount: numeric('overtime_amount').notNull().default('0.00'),
  overtime_notes: text('overtime_notes'),
  deductions_amount: numeric('deductions_amount').notNull().default('0.00'),
  deductions_notes: text('deductions_notes'),
  installment_deducted_amount: numeric('installment_deducted_amount').notNull().default('0.00'),
  gross_amount: numeric('gross_amount').notNull().default('0.00'),
  net_amount: numeric('net_amount').notNull().default('0.00'),
  entry_status: payrollEntryStatusEnum('entry_status').notNull().default('draft'),
  bank_account_snapshot: text('bank_account_snapshot'),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const insertPayrollEntrySchema = createInsertSchema(payrollEntriesTable)
export const selectPayrollEntrySchema = createSelectSchema(payrollEntriesTable)
export type InsertPayrollEntry = z.infer<typeof insertPayrollEntrySchema>
export type PayrollEntry = typeof payrollEntriesTable.$inferSelect

// ─── payroll_entry_components ─────────────────────────────────────────────────

export const payrollEntryComponentsTable = pgTable('payroll_entry_components', {
  id: uuid('id').primaryKey().defaultRandom(),
  payroll_entry_id: uuid('payroll_entry_id').notNull().references(() => payrollEntriesTable.id),
  component_type: payrollComponentTypeEnum('component_type').notNull(),
  component_code: text('component_code').notNull(),
  amount: numeric('amount').notNull(),
  notes: text('notes'),
  source_line_id: uuid('source_line_id').references(() => obligationLinesTable.id),
  sort_order: numeric('sort_order').notNull().default('0'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type PayrollEntryComponent = typeof payrollEntryComponentsTable.$inferSelect

// ─── payroll_slips ────────────────────────────────────────────────────────────

export const payrollSlipsTable = pgTable('payroll_slips', {
  id: uuid('id').primaryKey().defaultRandom(),
  payroll_entry_id: uuid('payroll_entry_id').notNull().unique().references(() => payrollEntriesTable.id),
  slip_number: text('slip_number').notNull().unique(),
  storage_path: text('storage_path'),
  template_version: text('template_version').notNull().default('v1'),
  snapshot_data: jsonb('snapshot_data').notNull().default({}),
  generated_at: timestamp('generated_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type PayrollSlip = typeof payrollSlipsTable.$inferSelect
