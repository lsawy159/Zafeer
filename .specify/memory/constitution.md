<!--
SYNC IMPACT REPORT
==================
Version change: [TEMPLATE] → 1.0.0 (initial ratification)
Modified principles: N/A (first version)
Added sections: Core Principles (5), Security Requirements, Development Workflow, Governance
Removed sections: All placeholder tokens replaced
Templates requiring updates:
  ✅ plan-template.md — Constitution Check gates aligned
  ✅ spec-template.md — no changes needed (template is generic)
  ✅ tasks-template.md — no changes needed
Follow-up TODOs:
  - TODO(RATIFICATION_DATE): Set to 2026-05-07 (today, first constitution write)
  - TODO(RLS_POLICIES): Supabase RLS policies not yet defined — must be done before production
-->

# Zafeer Constitution

## Core Principles

### I. Supabase-First Data Layer (NON-NEGOTIABLE)

The frontend MUST query Supabase directly for all domain data (employees, companies, projects, payroll, alerts, transfer procedures).
No intermediate Express/REST layer for domain reads or writes — the Supabase client with RLS is the data access layer.
The Express API server (`artifacts/api-server`) MUST be used ONLY for admin operations requiring the service role key (user account management, privileged mutations not safe to expose to the browser).
Any new data entity MUST be defined as a Drizzle table in `lib/db/src/schema/` and migrated via Drizzle migrations — no manual DB edits.

### II. Arabic UX — RTL First

All user-facing text MUST be in Arabic.
Dates MUST use `dd/MM/yyyy` format.
Currency MUST display in EGP (Egyptian Pound).
Layout MUST be RTL (`dir="rtl"`).
Error messages, toast notifications, labels, and placeholders MUST be in Arabic.
Technical identifiers (variable names, route paths, API keys) remain in English.

### III. Type Safety Throughout

TypeScript MUST be used in all packages — no `any` unless explicitly justified with a comment.
Domain types MUST originate from `lib/api-zod` (generated from `lib/api-spec/openapi.yaml`) or from Drizzle schema inference in `lib/db`.
Zod schemas MUST be the single source of truth for request/response validation on the API server.
`pnpm run typecheck` MUST pass with zero errors before any merge.

### IV. Security via Supabase RLS

Row Level Security (RLS) MUST be enabled on every table in Supabase that contains user data.
No sensitive operation (delete, bulk update, role assignment) MUST be exposed via frontend Supabase calls — these MUST go through the admin API with `requireAdmin` middleware.
The service role key (`SUPABASE_SERVICE_ROLE_KEY`) MUST never appear in frontend code or be committed to the repository.
User roles MUST be one of: `admin`, `manager`, `user` — consistently across `auth.ts` middleware, the `users` table, and all permission checks.

### V. Monorepo Package Discipline

Shared logic MUST live in `lib/` packages — no copy-paste between `artifacts/`.
Each `lib/` package has a single owner:
  - `lib/db` → Drizzle schema + migrations only
  - `lib/api-spec` → OpenAPI YAML source of truth
  - `lib/api-zod` → generated Zod types (run `orval` to regenerate, do not hand-edit)
  - `lib/api-client-react` → generated React Query hooks (same — do not hand-edit)
Adding a new endpoint MUST follow this order: `api-spec` → `api-zod` → `api-client-react` → `api-server` route.
`pnpm -r run build` MUST pass before shipping any change to shared libs.

## Security Requirements

- The Express API MUST validate all inputs with Zod schemas before processing.
- CORS MUST be restricted to known origins in production — `app.use(cors())` (open) is only acceptable in development.
- Rate limiting MUST be applied to all admin API endpoints before production deployment.
- Passwords MUST never be logged — pino serializers MUST exclude `password`, `token`, `key` fields.
- `.env` files MUST NOT be committed — `.env.example` with placeholder values MUST exist at `artifacts/api-server/.env.example`.

## Development Workflow

- DB changes: write Drizzle migration → apply via `drizzle-kit push` (dev) or migration script (prod). No Supabase Dashboard manual edits.
- New feature: create spec with `/speckit-specify` → plan with `/speckit-plan` → tasks with `/speckit-tasks` → implement.
- Before merging: `pnpm run typecheck` passes, existing tests pass, no new TypeScript `any` without justification.
- Commit messages follow format: `[scope]: description in Arabic` (e.g., `[api]: إضافة endpoint إدارة الموظفين`).
- Test pages (`CommercialRegTestPage`, `EnhancedAlertsTestPage`, `DesignSystem`) MUST NOT appear in production navigation.

## Governance

This constitution supersedes all other conventions in case of conflict.
Amendments require: documenting the change reason, bumping version (MAJOR/MINOR/PATCH), updating this file, and noting in the PR description.
All spec/plan/task documents MUST reference constitution principles by name when a principle gate applies.
Complexity deviations from any MUST rule MUST be documented in `plan.md` under "Complexity Tracking" with justification.

**Version**: 1.0.0 | **Ratified**: 2026-05-07 | **Last Amended**: 2026-05-07
