# Audit 084 — QA Findings Summary (2026-07-02 deep audit)

Branch: `fix/084-activity-log-sessions-permissions-audit` (based off `staging`, never merged/pushed to `main`).
Source: `deep_audit_report_2026-07-02.docx`. Excluded from scope: Salary Certificate page (intentional single-company hardcode, not touched).

Every finding below was independently re-verified against the current code before any change — the audit report was treated as a lead, not a ground truth.

---

## Finding 1 — Activity log shows the same diff twice with mismatched counts

**Confirmed.** Root cause: `generateActivityDescription()` (`activityLogHelpers.tsx`) fell back to rendering the *entire* diff card (via its own `renderUpdateDetails()`) as the plain-text "description" whenever no short field-summary applied — which happens for any entity type outside employee/company-with-a-name (so: any update where the entity doesn't resolve a name, and in the future, entity types like `document_requirement_rule` once spec 083 merges). `LogDetailsModal.tsx` then rendered *its own*, independently-implemented diff below that. The two implementations filtered `updated_at`/`created_at` differently, producing mismatched counts (e.g. "3" vs "2") for the same event.

**Blast radius:** `generateActivityDescription`/`renderUpdateDetails` (activityLogHelpers.tsx) are only consumed by `LogDetailsModal.tsx`, which is only used from `ActivityLogs.tsx`. No other callers found.

**Fix:** `generateActivityDescription()` now always returns a short one-line string; the modal's own diff render is the single source of truth for the detailed change list. Removed the now-dead `renderUpdateDetails()`/`formatDisplayValue()` duplicate in `activityLogHelpers.tsx` (confirmed unused elsewhere via grep).

**Verified:** typecheck, lint, full unit suite (1169 tests), production build all clean. Live UI click-through not performed — see "Verification limitations" below.

**File:** `artifacts/zafeer/src/components/activity/activityLogHelpers.tsx`

---

## Finding 2 — Document-rule edits write two activity_log rows

**Confirmed as by-design — not fixed. Blocked, not skipped-lazily.**

The Document Requirement Rules feature (spec 083) does not exist on `staging` at all — no pages, no hooks, no migrations. It only exists on the local, never-pushed `083-document-requirement-rules` branch. Since this fix branch is based off `staging` per the task's hard constraint, there is no code here to change.

Read-only investigation of the 083 branch (via `git show`, no checkout) confirmed the root cause anyway: `upsert_document_rule` RPC does an atomic UPDATE (supersede old row) + INSERT (new row) in one transaction; a **dedicated, per-table** trigger `log_document_rule_change()` logs each DML op separately. This is intentional atomic-replace/supersede design, not a bug — confirmed by the hook's own code comment describing the "استبدال+إدخال ذرّي" (atomic supersede+insert) contract.

Asked the owner how to proceed; decision: **defer until spec 083 is merged to staging**, then revisit whether the generic ActivityLogs list UI should visually group these paired rows.

---

## Finding 3 — Logout doesn't set `logged_out_at`; no cleanup of expired sessions

**Confirmed, both halves.**

1. `terminateUserSessions()` in `AuthContext.tsx` (called from `signOut`) only set `is_active: false` — never `logged_out_at`. Inconsistent with the admin force-terminate path in `SessionsManager.tsx` (line ~137), which already sets both. Fixed to match.
2. No cron/RPC existed anywhere to correct `user_sessions` rows once `expires_at` passed — confirmed via full grep of `supabase/migrations` and `supabase/functions`. Reads (`SessionsManager`, `AuthContext`, `sessionManagement.ts`) all filter with `.gt('expires_at', now)`, so this wasn't visible as "active" in the app's own UI, but the raw rows stayed `is_active=true` forever with no `logged_out_at`, which is a real data-integrity gap for anyone (or any future feature) reading the table without that same filter.

**Blast radius:** `terminateUserSessions` has exactly one caller (`signOut`). The new cleanup function is new, additive, and internal-only (no `authenticated`/`anon` grant), following the same pattern as the existing `cleanup_orphaned_notifications` cron.

**Fix:**
- `AuthContext.tsx`: `terminateUserSessions` now also sets `logged_out_at: new Date().toISOString()`.
- New migration `supabase/migrations/20260702130000_084a_session_expiry_cleanup.sql`: `cleanup_expired_user_sessions()` RPC + hourly `pg_cron` job that flips `is_active=false` and backfills `logged_out_at = expires_at` for any row where `is_active=true AND expires_at < now()`.

**⚠️ Not yet applied to the staging database.** No Supabase CLI or authenticated MCP session was available in this session (`mcp__supabase-staging__*` tools returned "Unauthorized" — no access token configured; no `supabase` CLI binary found on PATH). **Someone with staging credentials needs to run `supabase db push` (or apply the migration via the dashboard) against the staging project before this half of finding 3/4 is actually live.** The frontend half (`logged_out_at` on logout) needs no such step — it's a plain code change.

**Verified:** typecheck, lint, full unit suite, build all clean.

**Files:** `artifacts/zafeer/src/contexts/AuthContext.tsx`, `supabase/migrations/20260702130000_084a_session_expiry_cleanup.sql`

---

## Finding 4 — Multiple concurrent logins, no consolidation

**Confirmed — but same root cause as finding 3, already fixed there. No separate change made.**

The only `user_sessions` insert path (`createUserSession` in `AuthContext.tsx`) already does a check-then-act dedup (`SELECT ... WHERE is_active=true AND expires_at > now()` before inserting), so under normal sequential logins you don't get duplicate *active* rows. Before the finding-3 fix, though, a user who closed their browser without clicking "sign out" left an `is_active=true` row that never got corrected — so a subsequent login *after* that row's `expires_at` had passed (but before anyone flipped the flag) could produce two rows both showing `is_active=true` simultaneously in raw data. Independently sanity-checked this reasoning with a second-opinion review before concluding.

The now-hourly cleanup cron (finding 3) closes this window down to ≤1 hour. A residual true millisecond-scale race (two logins hitting the SELECT before either INSERT completes) is theoretically still possible but has no demonstrated functional harm — `validateSessionInDatabase()` only checks "does *any* active row exist for this user," not a specific row, and `SessionsManager` already lets an admin see/terminate multiple device sessions individually, which is arguably correct behavior for multi-device use, not a bug. Enforcing single-active-session-per-user at the DB level would be a product policy decision (block multi-device login) that isn't implied anywhere else in the code — not making that call unilaterally.

**No fix applied beyond the finding-3 migration.**

---

## Finding 5 — Inert permission grants (backupSettings/sessionsManagement) never stripped on save

**Confirmed and fixed.**

`Permissions.tsx`'s `availablePermissionKeys` (used to filter what gets sent to `update_user_as_admin` on save) was built from `VALID_PERMISSION_SECTIONS` (all sections) instead of `GRANTABLE_PERMISSION_SECTIONS` (which already excludes `backupSettings`/`sessionsManagement` and is already used to drive the grant-UI checkboxes). A legacy stored grant for one of those sections passed the save-time filter unchanged forever, with no UI path to remove it, and inflated the "عدد الصلاحيات" (permission count) column.

**Fix:**
- `availablePermissionKeys` now sources from `GRANTABLE_PERMISSION_SECTIONS` — a resave now silently drops the inert keys.
- The "عدد الصلاحيات" count column is now also filtered through `availablePermissionKeys`, so already-affected users show the correct count immediately, without needing an edit+save round-trip.

**`adhkar` deliberately left alone** — its schema comment documents it as `[catalog-only]` by design: RLS restricts CRUD to admin regardless of what's granted, and it's kept visible in the catalog "للاطلاع" (for admin reference). That's a different, already-documented rationale from the two now-inert sections (which are hidden entirely because the tabs themselves are `isAdmin`-gated) — not the same bug, so not folded into this fix.

**Verified:** typecheck, lint (both clean), full unit suite green.

**File:** `artifacts/zafeer/src/pages/Permissions.tsx`

---

## Finding 6 — GeneralSettings summary cards shown on every tab

**Confirmed and fixed.** The three cards (إجمالي الإعدادات / المستخدمون النشطون / آخر تحديث) sat structurally outside the tab-content switch and rendered unconditionally on every admin-settings tab (backup, sessions, audit, permissions, email/alert settings, activity logs, adhkar) — all showing the same `system_settings`-derived numbers regardless of context.

**Fix:** gated the whole card block behind `activeTab === 'system'`, since all three metrics specifically describe the `system_settings` table (settings count, last update) plus active-user-account count, which only makes sense as a "system" overview.

**Verified:** typecheck, lint, full unit suite, build all clean.

**File:** `artifacts/zafeer/src/pages/GeneralSettings.tsx`

---

## Finding 7 — Employees/Companies stats cards don't recompute for active filters

**Confirmed NOT a bug — no fix made.**

Both pages already have a dedicated, separate "showing X of Y" indicator (`عرض {filtered} من {total} ...{N فلتر نشط}`) right next to the summary cards. The cards themselves are explicitly labeled "إجمالي" (**total**) and double as click-to-filter severity triggers (clicking "urgent: 5" adds that severity as a table filter) — recomputing them off the *currently applied* filter would make that interaction incoherent (the number driving the filter would change the moment you apply it). This is a consistent, deliberate two-tier design already present on both pages, not a bug where one component's fix leaked from the other.

---

## Finding 8 — Reports "الاشتراكات القريبة من الانتهاء" section dominated by expired items

**Confirmed as a labeling mismatch, not a sort/data bug — fixed via copy only.**

`categorizeExpiry()` intentionally includes every tracked expiry date (`expired`/`urgent`/`medium`/`valid`), and the sort is a deliberate triage priority — expired group first, then by how overdue, then urgent/medium/valid — a reasonable "fix the most overdue thing first" ordering. `filterStatus` defaults to `'all'`. The section title just said "**قريبة من الانتهاء**" (approaching expiry), which doesn't describe a table that also includes long-overdue items by design — hence a `منتهي منذ 183 يوم` row sitting at the very top looking like a bug.

**Fix:** retitled to "حالة الاشتراكات ومواعيد الانتهاء" (subscription status and expiry dates) to match actual scope. No sort/filter/data logic touched.

**Verified:** typecheck, lint, full unit suite, build all clean.

**File:** `artifacts/zafeer/src/pages/Reports.tsx`

---

## Verification limitations (read before merging)

- **Migration not applied to staging.** See finding 3 — needs `supabase db push` (or dashboard) run by someone with staging credentials, then a manual re-check that the hourly cron fired (`SELECT * FROM cron.job WHERE jobname = 'cleanup-expired-user-sessions-hourly'`).
- **No live browser click-through was completed for the 5 shipped fixes.** A local dev server was started against staging (`scripts/run-staging-ui.ps1 -Port 5199`, confirmed `TARGET_CHECK=PASS` / `vpxazxzekkkepfjchjly`) specifically to do this, but the repo's `e2e/` Playwright install turned out to have a broken/stale `node_modules` symlink (`@playwright/test` resolves to a `.pnpm` store path that doesn't exist on disk) — pre-existing environment issue, unrelated to this branch. Confidence instead rests on: exact root-cause identification by reading the code paths involved, `tsc --noEmit` (clean), `eslint src --quiet` (0 errors on every touched file), the full unit suite (1169/1169 passing), and a production build (succeeds). **Recommend a manual click-through of all 5 fixes on staging before merging** — specifically: an update-triggering activity-log entry with a single diff and matching count; GeneralSettings tab-switching hides the cards outside "system"; a user with a legacy backupSettings/sessionsManagement grant shows the corrected count and drops it on save; and the Reports page header text.
- **Re-fixing `e2e/`'s broken Playwright install was out of scope** for this task (would need `pnpm install`, network access, and isn't caused by anything touched here) — flagging it as a separate, pre-existing issue worth a look.
