<!--
SYNC IMPACT REPORT
==================
Version change: 1.1.0 → 1.2.0
Bump rationale: MINOR — أُضيف Principle VII جديد (Internal System Architecture — Users vs Employees).
المبدأ يُقنّن قاعدة معمارية صارمة: employees = data records فقط، لا login، لا RLS بناءً على auth.uid()
مقابل employees. صادر من توضيح مالك المشروع 2026-05-15.

Modified principles: لا شيء — إضافة فقط.

Added sections:
  - Principle VII: Internal System Architecture — Users vs Employees (NON-NEGOTIABLE)
    يحظر أي employee-scoping في RLS + يحدد أن RLS يُبنى على users.role + users.permissions فقط.

Removed sections: لا شيء.

Resolved TODOs (من v1.1.0):
  ✅ RENAME_EXECUTION: Spec 003 مكتمل (PR #125 merged + tag v3-rename-complete).
  ✅ VERCEL_PROJECT_NAME: domain alias محدّث (أنجزه المالك).

Templates requiring updates:
  ✅ plan-template.md — generic، لا تعديل.
  ✅ spec-template.md — generic، لا تعديل.
  ✅ tasks-template.md — generic، لا تعديل.

Follow-up TODOs:
  - TODO(RLS_PERMISSION_BUG): user_has_permission() تقرأ permissions كـ object لكن DB يخزّنها
    كـ flat array — يُصلح في Spec 004 Phase B.
  - TODO(GET_ALL_USERS_RPC): get_all_users_for_admin RPC يُستدعى من Permissions.tsx —
    وجوده في DB يحتاج تحقق + إنشاء إن لزم — ضمن Spec 004 audit task.
-->

# Zafeer Constitution

## Core Principles

### I. Supabase-First Data Layer (NON-NEGOTIABLE)

The frontend MUST query Supabase directly for all domain data (employees, companies, projects, payroll, alerts, transfer procedures).
No intermediate Express/REST layer for domain reads or writes — the Supabase client with RLS is the data access layer.
The Express API server (`artifacts/api-server`) MUST be used ONLY for admin operations requiring the service role key (user account management, privileged mutations not safe to expose to the browser).
Any new data entity MUST be defined as a Drizzle table in `lib/db/src/schema/` and migrated via Drizzle migrations — no manual DB edits.

### II. Arabic UX — RTL First (Gulf market)

All user-facing text MUST be in Arabic.
Dates MUST use `dd/MM/yyyy` format.
Currency MUST display in **SAR (Saudi Riyal)** — written as "ريال" — and number formatting MUST use locale `ar-SA`. The product is targeted at the Gulf market (KSA primary; UAE, Kuwait, Qatar, Oman, Bahrain secondary). Use of `EGP`, locale `ar-EG`, or "جنيه" in new code is FORBIDDEN. Multi-currency support, if added later, MUST default to SAR and MUST be configurable per company/tenant — not hardcoded.
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

### VI. Brand Identity & Naming Discipline — ZaFeer (NON-NEGOTIABLE)

The official, sole product name is **ZaFeer** (Arabic: **زفير**).
Legacy names — `sawtracker`, `SawTracker`, `MinMax`, `MinMax SawTracker`, `ساو تراكر` — are FORBIDDEN in:
  - any new file or folder name (`*.ts`, `*.tsx`, configs, workflows, docs)
  - any new identifier, import path, package name, environment variable, npm/pnpm script
  - any user-facing string (titles, page headings, toast text, ARIA labels, meta tags, OG/title)
  - any new `localStorage` / `sessionStorage` / `indexedDB` key
  - any new database column, table, index, RPC, view, function, or schema name
  - any new commit message scope, branch name, or PR title

Existing legacy references MUST be eliminated according to the following rules:

1. **Active code (`artifacts/*/src/`, `lib/*/src/`, `supabase/`, `scripts/`, `e2e/`)**: rename required. Any change to a file containing a legacy reference MUST also remove the legacy reference in that file as part of the same commit (boy-scout rule).
2. **Build/CI/deployment configs (`vercel.json`, `.lighthouserc.js`, `.github/workflows/`, `.dockerignore`, `package.json`, `pnpm-workspace.yaml`, `e2e/playwright.config.ts`, `scripts/check-local.ps1`, `.replit-artifact/artifact.toml`)**: rename required, MUST be performed atomically with folder/package renames in a dedicated rename spec — no partial config changes.
3. **Folder rename (`artifacts/sawtracker` → `artifacts/zafeer`)**: MUST use `git mv` to preserve history; MUST be paired in the same commit with all dependent config updates listed in (2).
4. **Workspace package rename (`@workspace/sawtracker` → `@workspace/zafeer`)**: MUST regenerate `pnpm-lock.yaml` and validate `pnpm typecheck` + `pnpm build` + `pnpm --filter @workspace/zafeer run lint:strict` before commit.
5. **`localStorage`/`sessionStorage` keys** containing `sawtracker`: rename to `zafeer:*` MUST include a one-shot migration that copies the legacy key value to the new key on first load and deletes the legacy key. No silent loss of user preferences.
6. **Database identifiers** containing legacy names: NOT permitted to be renamed by code edit alone — MUST go through a Drizzle/SQL migration, with backward-compatible views or aliases when an external integration depends on the legacy name. If no such name currently exists in the live schema (verified via `supabase/migrations/`), this rule is moot.
7. **Historical specs and handoff docs** (`specs/0XX-*/`, `handoff/*.md`, archived ADRs): MUST be left untouched. They are immutable historical record. A single index disclaimer at the spec root is sufficient.
8. **Active operator docs** (`README.md`, `CONTRIBUTING.md`, `RUNBOOK.md`, `artifacts/*/docs/`, top-level guides): MUST be updated to reflect current names whenever they are touched, and as part of any rename spec.
9. **Vercel project + GitHub repo names**: MUST match `zafeer`. Any mismatch MUST be tracked as a TODO in the rename spec until reconciled in the respective dashboard.
10. **Blind global replace is FORBIDDEN.** Every legacy occurrence MUST be evaluated for binding (route, import, env var, DB ref, external integration) before edit. Renames that would break the build, the CI, the deployment, or the database MUST be staged, paired with their dependents, and tested before commit.

Rationale: a single canonical brand name protects users (no confusion in UI), developers (no ambiguity in imports/configs), and operations (no broken deploys from inconsistent identifiers). Allowing legacy names to linger creates compounding tech debt and accidental re-introduction risk.

### VII. Internal System Architecture — Users vs Employees (NON-NEGOTIABLE)

ZaFeer is a **strictly internal management dashboard**. Access is granted only to authorized internal team members (Admin and Team Users). It is NOT a self-service portal for the workforce it manages.

The two primary people-related tables serve fundamentally different purposes and MUST NEVER be conflated:

- **`public.users`** — internal team members who authenticate and operate the system. Every row has a corresponding `auth.users` entry. RLS, permissions, and role checks MUST be based solely on this table.
- **`public.employees`** — HR data records (data subjects managed by the system). Employees DO NOT have login accounts, passwords, sessions, or any system access. There is no `auth.uid()` relationship for employees.

The following patterns are FORBIDDEN in all new code and migrations:

1. Any RLS policy that uses `employees.id = auth.uid()` or any equivalent employee-to-session binding.
2. Any feature that allows an employee (data record) to authenticate, view, or modify their own data.
3. Any UI route, API endpoint, or DB function designed for "employee self-service."
4. Any foreign key from `employees` to `auth.users` (unless explicitly for audit tracking of which *team member* modified the record, NOT the employee themselves).

RLS policies MUST be designed exclusively around:
- `users.role` (`admin` | `manager` | `user`)
- `users.permissions` JSONB (flat array of `"section.action"` strings, e.g. `"employees.view"`)
- The `user_has_permission(section, action)` SECURITY DEFINER function

Admin (`role = 'admin'`) MUST retain unrestricted access to all tables at all times. No migration or policy change may lock out the admin role.

Rationale: conflating the two tables leads to incorrect RLS designs that either expose all employee data or attempt to scope data to "the employee themselves" — both are architectural errors in a centralized management system.

## Security Requirements

- The Express API MUST validate all inputs with Zod schemas before processing.
- CORS MUST be restricted to known origins in production — `app.use(cors())` (open) is only acceptable in development.
- Rate limiting MUST be applied to all admin API endpoints before production deployment.
- Passwords MUST never be logged — pino serializers MUST exclude `password`, `token`, `key` fields.
- `.env` files MUST NOT be committed — `.env.example` with placeholder values MUST exist at `artifacts/api-server/.env.example`.
- Secrets, API keys, Supabase service-role tokens, and OAuth client secrets MUST NEVER be written into `memory/`, `CLAUDE.local.md`, or any AI-assistant memory file.

## Development Workflow

- DB changes: write Drizzle migration → apply via `drizzle-kit push` (dev) or migration script (prod). No Supabase Dashboard manual edits.
- New feature: create spec with `/speckit-specify` → plan with `/speckit-plan` → tasks with `/speckit-tasks` → implement.
- Before merging: `pnpm run typecheck` passes, existing tests pass, no new TypeScript `any` without justification.
- Commit messages follow format: `[scope]: description in Arabic` (e.g., `[api]: إضافة endpoint إدارة الموظفين`). The scope MUST NOT contain legacy product names.
- Test pages and demo/sandbox routes MUST NOT appear in production navigation.
- Renames touching folder structure, workspace packages, or build configs MUST be performed in a dedicated rename spec (see Principle VI). Mixing rename with feature work in the same commit is FORBIDDEN.

## Governance

This constitution supersedes all other conventions in case of conflict.
Amendments require: documenting the change reason, bumping version (MAJOR/MINOR/PATCH), updating this file, and noting in the PR description.
All spec/plan/task documents MUST reference constitution principles by name when a principle gate applies.
Complexity deviations from any MUST rule MUST be documented in `plan.md` under "Complexity Tracking" with justification.
Principle VI (Brand Identity) violations in any new code or new commit MUST block merge regardless of CI status.

**Version**: 1.2.0 | **Ratified**: 2026-05-07 | **Last Amended**: 2026-05-15
