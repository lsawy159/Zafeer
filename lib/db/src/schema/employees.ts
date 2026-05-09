import {
  pgTable, uuid, text, bigint, date, timestamp, boolean, numeric, jsonb,
} from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod/v4'
import { companiesTable } from './companies'
import { projectsTable } from './projects'

export const employeesTable = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  company_id: uuid('company_id').notNull().references(() => companiesTable.id),
  project_id: uuid('project_id').references(() => projectsTable.id),
  name: text('name').notNull(),
  profession: text('profession'),
  nationality: text('nationality'),
  birth_date: date('birth_date'),
  phone: text('phone'),
  passport_number: text('passport_number'),
  residence_number: bigint('residence_number', { mode: 'number' }),
  joining_date: date('joining_date'),
  contract_expiry: date('contract_expiry'),
  hired_worker_contract_expiry: date('hired_worker_contract_expiry'),
  residence_expiry: date('residence_expiry'),
  health_insurance_expiry: date('health_insurance_expiry'),
  bank_account: text('bank_account'),
  residence_image_url: text('residence_image_url'),
  salary: numeric('salary'),
  notes: text('notes'),
  project_name: text('project_name'),
  additional_fields: jsonb('additional_fields').default({}),
  is_deleted: boolean('is_deleted').default(false),
  deleted_at: timestamp('deleted_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const insertEmployeeSchema = createInsertSchema(employeesTable)
export const selectEmployeeSchema = createSelectSchema(employeesTable)
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>
export type Employee = typeof employeesTable.$inferSelect
