# Data Model: إصلاح أمان الاستعادة واستقرار المايجرشن

## Backup History

- **Represents**: A backup or pre-restore snapshot stored in `backup_history`.
- **Key fields**:
  - `id`
  - `backup_type`
  - `triggered_by`
  - `file_path`
  - `file_size`
  - `compression_ratio`
  - `status`
  - `started_at`
  - `completed_at`
  - `error_message`
  - `tables_included`
  - `table_record_counts`
- **Validation rules**:
  - Completed backups must have a file path and final status.
  - Snapshot metadata must record table inclusion and record counts.

## Restore History

- **Represents**: One restore attempt and its final outcome.
- **Key fields**:
  - `id`
  - `backup_id`
  - `executed_by`
  - `snapshot_id`
  - `status`
  - `started_at`
  - `completed_at`
  - `tables_restored`
  - `records_restored`
  - `error_message`
  - `notes`
- **State transitions**:
  - `pending` -> `creating_snapshot` -> `reading_file` -> `staging_data` -> `restoring_data` -> `completed`
  - Any intermediate state can transition to `failed`
- **Validation rules**:
  - Every restore attempt must have a backup source.
  - The executing user must be an authorized internal admin.
  - Failed attempts must preserve the error reason in the final record.

## Restore Staging

- **Represents**: Temporary chunked restore payloads staged during one restore attempt.
- **Key fields**:
  - `id`
  - `session_id`
  - `table_name`
  - `data`
  - `chunk_index`
  - `chunk_total`
  - `created_at`
- **Lifecycle**:
  - Created during restore staging
  - Read by the restore execution step
  - Deleted after success or failure
- **Validation rules**:
  - `session_id` groups all chunks for a single attempt.
  - `chunk_index` must preserve ordering.
  - Staged data must not remain after the restore attempt ends.

## System Settings

- **Represents**: Operational settings used by backup and restore flows.
- **Relevant fields**:
  - `setting_key`
  - `setting_value`
  - `maintenance_until`
- **Validation rules**:
  - Maintenance state must be time-bound and clearable.
  - Restore flow must be able to set and clear maintenance state consistently.

## Operational Relationships

- `restore_history.backup_id` points to the source backup record.
- `restore_history.snapshot_id` points to the pre-restore snapshot record.
- `restore_staging.session_id` groups temporary restore rows for one attempt.
- `backup_history.table_record_counts` stores per-table counts for both backup and restore review.
