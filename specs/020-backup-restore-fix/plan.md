# Implementation Plan: إصلاح أمان الاستعادة واستقرار المايجرشن

**Branch**: `021-backup-restore-fix` | **Date**: 2026-05-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/020-backup-restore-fix/spec.md`

## Summary

إصلاح مسار backup/restore الحالي بحيث تصبح الاستعادة مقفولة على المسؤولين فقط، ويظل سجل الفشل واضحًا ومحتفظًا به، وتبقى البيانات المؤقتة معزولة ومؤقتة، مع الحفاظ على استقرار المايجرشن بين البيئات الحالية والجديدة.

## Technical Context

**Language/Version**: TypeScript 5.x + PostgreSQL SQL + Deno Edge Functions  
**Primary Dependencies**: Supabase JS v2, Drizzle ORM schema, Supabase Storage, pg_net extension  
**Storage**: Supabase PostgreSQL (`backup_history`, `restore_history`, `restore_staging`, `system_settings`) + Storage bucket `backups`  
**Testing**: `pnpm run typecheck` + manual Edge Function smoke verification  
**Target Platform**: Web admin dashboard + Supabase Edge Functions  
**Project Type**: Monorepo web app with Supabase backend and Edge Functions  
**Performance Goals**: Restore flow should complete deterministically for large backup sets without leaving partial visible state; lock contention must fail fast  
**Constraints**: Admin-only restore behavior; no employee self-service; no manual dashboard DB edits; migration history must remain stable across environments  
**Scale/Scope**: Single ZaFeer workspace, one restore pipeline, four to six files touched in source plus migrations

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Supabase-First Data Layer | Pass | All changes stay in Supabase migrations, Edge Functions, and existing schema files. |
| II. Arabic UX - RTL First | Pass | User-facing error/status strings remain Arabic in the restore flow. |
| III. Type Safety Throughout | Pass | Drizzle schema remains source of truth for DB shape; TypeScript files stay type-checked. |
| IV. Security via Supabase RLS | Pass | Restore access remains admin-only; staging data is not exposed to authenticated clients. |
| V. Monorepo Package Discipline | Pass | Shared schema lives in `lib/db`; Edge Function logic stays in `supabase/functions`. |
| VI. Brand Identity & Naming Discipline | Pass | No legacy product names introduced or expanded. |
| VII. Users vs Employees | Pass | Restore and backup admin paths operate on internal users, not employees. |

**No violations, so no complexity tracking is required.**

## Project Structure

### Documentation (this feature)

```text
specs/020-backup-restore-fix/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/              # Not required; no new public external contract
```

### Source Code (affected files)

```text
lib/db/src/schema/system.ts
supabase/functions/restore-backup/index.ts
supabase/functions/automated-backup/index.ts
supabase/migrations/20260523_020_backup_restore_hardening.sql
supabase/migrations/20260521094259_016_backup_restore.sql  # existing baseline reference
```

**Structure Decision**: Keep the fix inside the existing Supabase/Edge Function workflow. Update the shared schema definition, tighten the Edge Function restore orchestration, and add/adjust SQL migrations instead of introducing a new service or API layer.

## Phase 0: Research

*See [research.md](research.md)*

## Phase 1: Design & Contracts

### Data Model

*See [data-model.md](data-model.md)*

### Contracts

No external contracts are added for this feature. The change is internal to the restore pipeline and Supabase schema.

### Verification

```bash
pnpm run typecheck
```

Manual smoke checks:
- Trigger a restore as admin and confirm the restore history ends in `completed`
- Trigger a restore with invalid auth and confirm it fails before data changes
- Trigger a restore while another restore is already active and confirm the second request is rejected immediately
- Confirm `restore_staging` rows are removed after success or failure
- Confirm migration application works on both an existing and a fresh environment
