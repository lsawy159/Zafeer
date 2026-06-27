# Supabase Schema Baseline

`schema.sql` is a local/staging bootstrap snapshot for creating a fresh database
without reading production again.

Important rules:

- Keep the historical files in `supabase/migrations/`; do not delete or rewrite
  them to make the baseline work.
- Apply `schema.sql` once to an initialized Supabase database/project, then mark
  existing migration versions as applied before running new forward migrations.
  It is not a standalone plain-Postgres bootstrap: it expects Supabase-managed
  schemas such as `auth`, `storage`, `net`, and `cron` to already exist.
- Do not mark migration history automatically until duplicate date-only migration
  versions are resolved. The 2026-06-27 staging rebuild left
  `supabase_migrations.schema_migrations` unchanged for this reason.
- Do not copy production data into staging.
- Do not copy staging seed/test data into production. Staging rows prove behavior
  only; production promotion moves reviewed code/schema/config changes, not
  disposable records.
- Do not commit service-role keys, private API keys, or environment-specific
  tokens in this file.
- Data API table grants are included, but function execution is explicitly
  revoked first and re-granted only to the intended roles. Do not replace that
  with a broad grant that gives `anon` execute access to every function.
- Scheduled backup HTTP settings are intentionally environment-specific:
  configure `backup_edge_function_url` and `backup_edge_function_anon_key` in the
  target environment only. If either is missing, scheduled backups no-op instead
  of calling production.

This baseline keeps the schema recoverable while preventing a staging database
from accidentally calling production Edge Functions.
