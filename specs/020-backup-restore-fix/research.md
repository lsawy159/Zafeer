# Research: إصلاح أمان الاستعادة واستقرار المايجرشن

## Decision 1: Keep restore orchestration in the existing Edge Function

- **Decision**: Continue using `supabase/functions/restore-backup/index.ts` as the main orchestration entrypoint.
- **Rationale**: The current flow already owns confirmation, snapshot creation, staging, and final RPC execution. Keeping the fix there avoids adding a second restore path or splitting state across services.
- **Alternatives considered**: Moving logic fully into SQL or introducing a separate backend service. Both would increase complexity without improving the operational model.

## Decision 2: Treat restore failure tracking as application-side state, not SQL-side finalization

- **Decision**: Persist failure status from the Edge Function path that owns the transaction boundary, rather than relying on a SQL exception handler that rethrows.
- **Rationale**: The current RPC path can roll back its own status update if it rethrows. The Edge Function can record the final user-facing outcome more reliably.
- **Alternatives considered**: Keeping only the RPC exception block or storing failure state in a separate logging table. The exception-block-only approach is fragile; a separate logging table would be more intrusive than needed.

## Decision 3: Keep temporary restore data in a dedicated staging table and delete it after each run

- **Decision**: Continue using `restore_staging` as the transient buffer for chunked restore data, but harden access so it is effectively private to the restore pipeline.
- **Rationale**: The current pipeline already depends on chunked staging for large backups. The safest improvement is to constrain access and ensure cleanup on both success and failure.
- **Alternatives considered**: Replacing staging with in-memory processing or a new file-based workflow. Those options would complicate large restore handling and increase the chance of partial failure.

## Decision 4: Preserve migration filenames once applied

- **Decision**: Do not rename already-applied migration files again; future changes should be delivered as new migrations only.
- **Rationale**: The repo already has multiple renamed migration files. Keeping filenames immutable avoids drift between local and remote migration histories.
- **Alternatives considered**: Re-basing history or renaming existing migrations back and forth. That would create unnecessary operational risk across environments.

## Decision 5: Keep the feature internal-only

- **Decision**: No public API contract or external interface is added.
- **Rationale**: The change is restricted to internal admin flows and database behavior.
- **Alternatives considered**: Introducing a dedicated restore API schema. Not needed for this scope.
