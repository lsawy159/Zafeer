import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { DEFAULT_PASSWORD_POLICY } from '@/utils/passwordPolicy'

/**
 * Spec 080 US5 (FR-012) — password-rule drift guard.
 *
 * The password-strength rules are defined twice:
 *   - frontend:  artifacts/zafeer/src/utils/passwordPolicy.ts (DEFAULT_PASSWORD_POLICY + validatePassword)
 *   - backend:   supabase/functions/admin-users/index.ts (validatePasswordComplexity)
 *
 * The backend file runs on Deno and CANNOT be imported into Vitest, so it is read
 * as plain TEXT and asserted to contain the same rule set. If either side changes
 * the rules or the symbol regex independently, this test FAILS.
 */

const __dirname = dirname(fileURLToPath(import.meta.url))
// tests/unit/utils -> repo root is five levels up
const repoRoot = resolve(__dirname, '../../../../../')
const adminUsersPath = resolve(repoRoot, 'supabase/functions/admin-users/index.ts')
const passwordPolicyPath = resolve(repoRoot, 'artifacts/zafeer/src/utils/passwordPolicy.ts')

// The single source of truth for the expected symbol character class.
// Reconstructed exactly (backtick spliced in) to avoid escaping the template literal.
const SYMBOL_CLASS = String.raw`[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?` + '`' + String.raw`~]`

describe('password policy drift guard (US5 / FR-012)', () => {
  it('the backend Deno function source exists (path resolves to repo root)', () => {
    expect(existsSync(adminUsersPath)).toBe(true)
    expect(existsSync(passwordPolicyPath)).toBe(true)
  })

  it('frontend DEFAULT_PASSWORD_POLICY enforces the expected rule set', () => {
    expect(DEFAULT_PASSWORD_POLICY.minLength).toBe(8)
    expect(DEFAULT_PASSWORD_POLICY.requireUpper).toBe(true)
    expect(DEFAULT_PASSWORD_POLICY.requireLower).toBe(true)
    expect(DEFAULT_PASSWORD_POLICY.requireDigit).toBe(true)
    expect(DEFAULT_PASSWORD_POLICY.requireSymbol).toBe(true)
  })

  it('backend admin-users validatePasswordComplexity enforces the identical rules', () => {
    const src = readFileSync(adminUsersPath, 'utf8')
    // minimum length of 8
    expect(src).toContain('password.length < 8')
    // uppercase / lowercase / digit checks
    expect(src).toContain('[A-Z]')
    expect(src).toContain('[a-z]')
    expect(src).toContain('\\d')
    // identical symbol character class
    expect(src).toContain(SYMBOL_CLASS)
  })

  it('frontend passwordPolicy.ts uses the identical symbol character class', () => {
    const src = readFileSync(passwordPolicyPath, 'utf8')
    expect(src).toContain(SYMBOL_CLASS)
    // and the same minimum length, sourced from the policy object
    expect(src).toContain('minLength: 8')
  })
})
