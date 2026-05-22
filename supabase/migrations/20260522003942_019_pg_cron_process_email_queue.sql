-- Migration 019: pg_cron hourly job for process-email-queue Edge Function
SELECT cron.schedule(
  'process-email-queue-hourly',
  '0 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://acnkrijhndgbnxabfklx.supabase.co/functions/v1/process-email-queue',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer <ANON_KEY>'
      ),
      body := '{}',
      timeout_milliseconds := 25000
    ) AS request_id;
  $$
);
