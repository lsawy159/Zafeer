-- Migration 019: Seed notification system settings
-- Seeds required keys for the daily-notification-run Edge Function.
-- ON CONFLICT DO NOTHING preserves any values the user has already set.

INSERT INTO system_settings (setting_key, setting_value)
VALUES
  ('admin_email',          '""'),
  ('quiet_hours_start',    '"23:50"'),
  ('quiet_hours_end',      '"08:30"'),
  ('notification_methods', '"in_app"')
ON CONFLICT (setting_key) DO NOTHING;
