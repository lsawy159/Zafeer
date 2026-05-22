-- Migration 019: pg_cron job for daily-notification-run Edge Function
-- Runs at 08:31 Asia/Riyadh = 05:31 UTC daily (after quiet hours end at 08:30)
-- Calls the Edge Function which handles quiet hours re-check + email sending

-- Remove old RPC-only job (no longer needed — Edge Function calls RPC internally)
SELECT cron.unschedule('daily-expiry-notifications');

-- Schedule new job that calls the Edge Function via HTTP
-- Note: uses anon key (publishable) — Edge Function uses its own SERVICE_ROLE_KEY env var
SELECT cron.schedule(
  'daily-notification-run-edge',
  '31 5 * * *',
  $$
    SELECT net.http_post(
      url := 'https://acnkrijhndgbnxabfklx.supabase.co/functions/v1/daily-notification-run',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer <ANON_KEY>'
      ),
      body := '{}',
      timeout_milliseconds := 25000
    ) AS request_id;
  $$
);
