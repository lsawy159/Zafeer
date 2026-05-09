// RLS test setup
// Requires real Supabase project credentials (not mocks — RLS must run in real Postgres)
// Set in .env.test.local:
//   SUPABASE_URL=https://xxx.supabase.co
//   SUPABASE_ANON_KEY=eyJ...
//   SUPABASE_SERVICE_ROLE_KEY=eyJ...

if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL required for RLS tests')
}
