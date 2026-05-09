import {
  pgTable, uuid, text, boolean, timestamp, integer, bigint, jsonb,
} from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod/v4'

// ─── users ──────────────────────────────────────────────────────────────────

export const usersTable = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').unique(),
  full_name: text('full_name').notNull(),
  role: text('role').notNull().default('user'),
  permissions: jsonb('permissions').default([]),
  is_active: boolean('is_active').default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  last_login: timestamp('last_login', { withTimezone: true }),
})

export const insertUserSchema = createInsertSchema(usersTable)
export const selectUserSchema = createSelectSchema(usersTable)
export type InsertUser = z.infer<typeof insertUserSchema>
export type User = typeof usersTable.$inferSelect

// ─── user_sessions ───────────────────────────────────────────────────────────

export const userSessionsTable = pgTable('user_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  ip_address: text('ip_address'),
  user_agent: text('user_agent'),
  session_token: text('session_token'),
  device_info: jsonb('device_info').default({}),
  location: text('location'),
  last_activity: timestamp('last_activity', { withTimezone: true }).defaultNow(),
  logged_out_at: timestamp('logged_out_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type UserSession = typeof userSessionsTable.$inferSelect

// ─── login_rate_limits ───────────────────────────────────────────────────────

export const loginRateLimitsTable = pgTable('login_rate_limits', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  identifier: text('identifier').notNull().unique(),
  email: text('email'),
  ip_address: text('ip_address'),
  attempts: integer('attempts').notNull().default(0),
  first_attempt_at: timestamp('first_attempt_at', { withTimezone: true }).notNull().defaultNow(),
  last_attempt_at: timestamp('last_attempt_at', { withTimezone: true }).notNull().defaultNow(),
  locked_until: timestamp('locked_until', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type LoginRateLimit = typeof loginRateLimitsTable.$inferSelect

// ─── login_attempts ──────────────────────────────────────────────────────────

export const loginAttemptsTable = pgTable('login_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email'),
  identifier: text('identifier'),
  success: boolean('success').notNull().default(false),
  ip_address: text('ip_address'),
  user_agent: text('user_agent'),
  attempt_type: text('attempt_type'),
  failure_reason: text('failure_reason'),
  user_id: uuid('user_id'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type LoginAttempt = typeof loginAttemptsTable.$inferSelect

// ─── saved_searches ──────────────────────────────────────────────────────────

export const savedSearchesTable = pgTable('saved_searches', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull(),
  name: text('name').notNull(),
  search_query: text('search_query'),
  search_type: text('search_type'),
  filters: jsonb('filters').default({}),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const insertSavedSearchSchema = createInsertSchema(savedSearchesTable)
export type InsertSavedSearch = z.infer<typeof insertSavedSearchSchema>
export type SavedSearch = typeof savedSearchesTable.$inferSelect
