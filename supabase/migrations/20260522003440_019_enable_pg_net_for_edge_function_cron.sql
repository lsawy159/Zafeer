-- Migration: 019_enable_pg_net_for_edge_function_cron
-- Applied: 2026-05-22 via MCP (branch: 020-csv-alert-report)
-- Purpose: enable pg_net extension required for pg_cron to call Edge Functions via HTTP

CREATE EXTENSION IF NOT EXISTS pg_net;
