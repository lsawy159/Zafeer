import {
  pgTable, uuid, text, boolean, integer, timestamp,
} from 'drizzle-orm/pg-core'
import { usersTable } from './users'

// ─── adhkar ──────────────────────────────────────────────────────────────────

export const adhkarTable = pgTable('adhkar', {
  id: uuid('id').primaryKey().defaultRandom(),
  text: text('text').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  sort_order: integer('sort_order').notNull().default(0),
  created_by: uuid('created_by').references(() => usersTable.id),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type AdhkarItem = typeof adhkarTable.$inferSelect
export type NewAdhkarItem = typeof adhkarTable.$inferInsert
