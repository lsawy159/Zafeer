import {
  pgTable, uuid, text, bigint, date, timestamp,
} from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod/v4'
import { usersTable } from './users'

// ─── projects ────────────────────────────────────────────────────────────────

export const projectsTable = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').default('active'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const insertProjectSchema = createInsertSchema(projectsTable)
export const selectProjectSchema = createSelectSchema(projectsTable)
export type InsertProject = z.infer<typeof insertProjectSchema>
export type Project = typeof projectsTable.$inferSelect

// ─── transfer_procedures ─────────────────────────────────────────────────────

export const transferProceduresTable = pgTable('transfer_procedures', {
  id: uuid('id').primaryKey().defaultRandom(),
  request_date: date('request_date').notNull(),
  name: text('name').notNull(),
  iqama: bigint('iqama', { mode: 'number' }).notNull(),
  status: text('status').notNull(),
  current_unified_number: bigint('current_unified_number', { mode: 'number' }).notNull(),
  project_id: uuid('project_id').notNull().references(() => projectsTable.id),
  created_by_user_id: uuid('created_by_user_id').references(() => usersTable.id),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const insertTransferProcedureSchema = createInsertSchema(transferProceduresTable)
export const selectTransferProcedureSchema = createSelectSchema(transferProceduresTable)
export type InsertTransferProcedure = z.infer<typeof insertTransferProcedureSchema>
export type TransferProcedure = typeof transferProceduresTable.$inferSelect
