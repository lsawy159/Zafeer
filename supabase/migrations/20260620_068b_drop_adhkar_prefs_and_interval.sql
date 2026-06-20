-- 068b: cleanup for environments that applied 068 before it was revised
-- Removes user_adhkar_preferences table and interval_ms from adhkar_display settings

DROP TABLE IF EXISTS public.user_adhkar_preferences;

UPDATE public.system_settings
  SET setting_value = setting_value - 'interval_ms'
WHERE setting_key = 'adhkar_display'
  AND (setting_value ? 'interval_ms');
