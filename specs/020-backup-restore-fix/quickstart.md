# Quickstart: إصلاح أمان الاستعادة واستقرار المايجرشن

## Prerequisites

- `pnpm` installed
- Supabase project linked for local or remote verification
- Admin test account available

## Verify the planed fix

1. Review the target files:
   - `lib/db/src/schema/system.ts`
   - `supabase/functions/restore-backup/index.ts`
   - `supabase/functions/automated-backup/index.ts`
   - `supabase/migrations/20260521094259_016_backup_restore.sql`
2. Run type checking:

```bash
pnpm run typecheck
```

3. Exercise restore flow as an admin account and confirm:
   - the restore request is accepted only for valid admins
   - the restore history ends in `completed`
   - `restore_staging` rows are removed afterward
   - a second restore request issued while the first is still running is rejected immediately
4. Exercise restore flow with an invalid or non-admin account and confirm:
   - the request is rejected before any data change
   - no restore rows are left in a partially visible state
5. Apply migrations to an existing environment and a fresh environment to confirm:
   - no filename or history conflict appears
   - the schema matches the expected restore workflow

## Success Signals

- Restore attempts are blocked early for non-admin users
- Failed restore attempts keep a readable failure reason
- Temporary staging data is cleaned up after each attempt
- Concurrent restore attempts fail fast instead of overlapping
- Existing environments accept the new migration set without manual fixes
