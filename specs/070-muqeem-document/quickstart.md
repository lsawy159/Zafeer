# Quickstart / Manual Verification: Muqeem Document

Prerequisites: migration applied, `pnpm install` current, dev server running, logged in with employees view+edit permission.

## SC-001 — Attach & view (edit flow)
1. Open an employee → Edit.
2. Drag a PDF (≤ 500 KB) onto the **وثيقة مقيم** drop zone → Save.
3. Reopen the employee → the وثيقة مقيم document is viewable/downloadable.
4. Confirm under 1 minute total. ✅

## SC-001 — Attach (add flow)
1. Add Employee → fill required fields → drop an image on the **ملف وثيقة مقيم** field → Create.
2. Open the new employee → the document is attached. ✅

## Validation
1. Edit → try a > 500 KB file or a `.txt` → Arabic error appears, nothing uploads. ✅

## Replace / delete
1. Edit → upload a replacement → Save → old object removed, new one shown.
2. Delete the document → field clears; on reload it stays empty. ✅

## SC-004 — No avatar change
1. Upload an **image** as وثيقة مقيم → Save.
2. The employee card avatar is unchanged (no crop modal appeared, no thumbnail). ✅

## SC-002 — Export
1. ImportExport → Export → select employees (some with the file, some without) → export.
2. Open the xlsx → column **رابط ملف وثيقة مقيم** present.
3. A row with a file = clickable hyperlink that opens the file; a row without = empty cell. ✅
4. (If a legacy http(s) value exists, the cell links directly to it.)

## SC-003 — Import & template clean
1. Download the employee template → no **رابط ملف وثيقة مقيم** column. ✅
2. Import the exported xlsx (which contains the column) → no blocking column error; the column is hidden in preview; no URL written to DB. ✅

## SC-005 — No regression
1. Residence image upload/crop/avatar still works.
2. Health Certificate + Ajeer Contract upload/view/export/import still work unchanged. ✅

## Gate
- `pnpm run typecheck` → 0 errors.
- `pnpm --filter zafeer test` (or repo test script) → unit tests pass incl. new muqeem assertions.
