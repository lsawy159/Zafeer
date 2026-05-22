-- T033: Add snoozed_until + is_deferred + UNIQUE constraint to notifications

-- Step 1: Dedupe existing rows — keep latest by created_at per (entity_type, entity_id, type)
WITH latest AS (
  SELECT DISTINCT ON (entity_type, entity_id, type) id
  FROM notifications
  ORDER BY entity_type, entity_id, type, created_at DESC NULLS LAST
)
DELETE FROM notifications WHERE id NOT IN (SELECT id FROM latest);

-- Step 2: UNIQUE constraint for safe UPSERT
ALTER TABLE notifications
  ADD CONSTRAINT notifications_entity_type_entity_id_type_unique
  UNIQUE (entity_type, entity_id, type);

-- Step 3: Snooze/defer columns
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_deferred BOOLEAN NOT NULL DEFAULT false;
