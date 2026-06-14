/**
 * One-shot cleanup script: removes all PW* test artifacts from the DB.
 *
 * Run once after discovering orphaned test data:
 *   npx tsx e2e/playwright/support/cleanupTestArtifacts.ts
 *
 * Requires env vars (from e2e/.env):
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   ← bypasses RLS to delete regardless of owner
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } })

// Pattern that all Playwright-created test rows follow
const PW_PREFIX = 'PW '

async function deleteTestRows(
  table: string,
  nameColumn: string,
  dryRun: boolean,
): Promise<number> {
  const { data, error } = await db
    .from(table)
    .select('id, ' + nameColumn)
    .like(nameColumn, `${PW_PREFIX}%`)

  if (error) {
    console.error(`  [${table}] SELECT error: ${error.message}`)
    return 0
  }

  const rows = data ?? []
  if (rows.length === 0) {
    console.log(`  [${table}] no test rows found`)
    return 0
  }

  console.log(`  [${table}] found ${rows.length} test row(s):`)
  for (const row of rows) {
    console.log(`    • ${row.id} — "${row[nameColumn]}"`)
  }

  if (dryRun) {
    console.log(`  [${table}] DRY RUN — skipping delete`)
    return rows.length
  }

  const ids = rows.map((r: { id: string }) => r.id)
  const { error: delError } = await db.from(table).delete().in('id', ids)

  if (delError) {
    console.error(`  [${table}] DELETE error: ${delError.message}`)
    return 0
  }

  console.log(`  [${table}] deleted ${ids.length} row(s) ✓`)
  return ids.length
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  if (dryRun) {
    console.log('=== DRY RUN — no rows will be deleted ===\n')
  } else {
    console.log('=== CLEANUP: Deleting PW* test artifacts from DB ===\n')
  }

  // Order matters: employees + payroll entries first (FK → companies/projects)
  let total = 0
  total += await deleteTestRows('employees', 'name', dryRun)
  total += await deleteTestRows('projects', 'name', dryRun)
  total += await deleteTestRows('companies', 'name', dryRun)

  console.log(`\nTotal rows ${dryRun ? 'found' : 'deleted'}: ${total}`)

  if (dryRun && total > 0) {
    console.log('\nRe-run without --dry-run to actually delete.')
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
