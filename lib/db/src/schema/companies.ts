import {
  pgTable, uuid, text, integer, bigint, date, timestamp, jsonb,
} from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod/v4'

export const companiesTable = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  unified_number: bigint('unified_number', { mode: 'number' }),
  labor_subscription_number: text('labor_subscription_number'),
  commercial_registration_expiry: date('commercial_registration_expiry'),
  commercial_registration_status: text('commercial_registration_status'),
  social_insurance_number: text('social_insurance_number'),
  social_insurance_expiry: date('social_insurance_expiry'),
  social_insurance_status: text('social_insurance_status'),
  ending_subscription_power_date: date('ending_subscription_power_date'),
  ending_subscription_moqeem_date: date('ending_subscription_moqeem_date'),
  ending_subscription_insurance_date: date('ending_subscription_insurance_date'),
  employee_count: integer('employee_count').default(0),
  current_employees: integer('current_employees').default(0),
  max_employees: integer('max_employees'),
  company_type: text('company_type'),
  exemptions: text('exemptions'),
  notes: text('notes'),
  additional_fields: jsonb('additional_fields').default({}),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const insertCompanySchema = createInsertSchema(companiesTable)
export const selectCompanySchema = createSelectSchema(companiesTable)
export type InsertCompany = z.infer<typeof insertCompanySchema>
export type Company = typeof companiesTable.$inferSelect
