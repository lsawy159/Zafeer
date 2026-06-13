-- Remove orphan system_settings rows for keys that were write-only and never consumed
DELETE FROM system_settings
WHERE setting_key IN ('notification_frequency', 'urgent_notifications');
