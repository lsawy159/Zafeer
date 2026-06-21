# Phase 0 Research: Employee Muqeem Document File Attachment

All unknowns are resolved by the already-merged feature 069 (Health Certificate / Ajeer Contract), which established the generic document-attachment pattern. This feature is a registry extension, so there are no open technical questions.

## Decision 1: Reuse 069 generic modules vs. build new

- **Decision**: Reuse `EMPLOYEE_DOC_TYPES`, `EmployeeDocumentField`, `EmployeeDocViewer`, `useEmployeeDocFile`, `validateEmployeeDocFile`, `buildEmployeeDocPath` from feature 069. Add only a `muqeem` registry entry plus parallel wiring blocks.
- **Rationale**: The 069 modules were intentionally designed generic (`EmployeeDocMeta` carries `column`/`folder`/`labelAr`/`exportHeaderAr`). Duplicating them would create drift and violate DRY. Verified present in branch base via grep.
- **Alternatives considered**: A new dedicated `muqeemDocument` lib/hook/components — rejected: pure duplication, higher regression surface, no benefit.

## Decision 2: Column type & nullability

- **Decision**: `muqeem_document_url TEXT NULL` on `employees`, added with `ADD COLUMN IF NOT EXISTS`. No default, no index, no FK.
- **Rationale**: Identical semantics to `health_certificate_url` / `ajeer_contract_url`. Stores a storage object path or a legacy external URL. Not queried by this column → no index.
- **Alternatives considered**: Separate child table for documents — rejected: over-engineering for a single optional path; inconsistent with 069.

## Decision 3: Storage location

- **Decision**: Reuse the existing private bucket `employee-documents`, new subfolder `muqeem-document/{employeeId}/{epochMs}.{ext}`. No new bucket, no new RLS policy.
- **Rationale**: Bucket RLS is path-agnostic and permission-based (`user_has_permission('employees', view|edit)`). `RESIDENCE_BUCKET === EMPLOYEE_DOC_BUCKET === 'employee-documents'`, so export signing stays a single batch.
- **Alternatives considered**: New bucket — rejected: needs new policies, breaks the single-batch export signing, no isolation benefit.

## Decision 4: Export column placement & signing

- **Decision**: Add the row key "رابط ملف وثيقة مقيم" immediately after "رابط ملف عقد الأجير" (before "الملاحظات"), add the path to the existing signed-URL `flatMap`, add the header to the generic `linkHeaders` loop, and append one `{ wch: 25 }` to both `!cols` arrays.
- **Rationale**: The hyperlink pass already loops over `linkHeaders` by header text (column-index-agnostic), so only the array entry is needed; signing reuses the same 7-day (604800s) batch.
- **Alternatives considered**: A positional hard-coded column index — rejected: the code is already generic by header text; positional logic is fragile.

## Decision 5: Import & template hygiene

- **Decision**: Extend `isColumnHidden` in `useImportBase.ts` with `normalized === normalizeColumnName('رابط ملف وثيقة مقيم') → true`. Confirm `EMPLOYEE_COLUMNS_ORDER` and `TemplatesTab` contain no URL columns (no change expected).
- **Rationale**: Mirrors the existing health/ajeer hide rules so re-importing an exported file ignores + hides the column without a blocking error.

## Decision 6: AddEmployeeModal layout

- **Decision**: The document grid currently is `md:grid-cols-3` with 3 fields (residence + health + ajeer). Adding muqeem makes 4 fields; change to `md:grid-cols-2` (2×2) to avoid an unbalanced 3+1 row, or `md:grid-cols-4` if horizontal space allows. Final choice deferred to implementation with a visual check; both are valid RTL layouts.
- **Rationale**: Cosmetic only; must not overflow the modal. Verified by webapp-testing screenshot during validation.

## Open questions

None. Document display name confirmed by user: "وثيقة مقيم"; field label "ملف وثيقة مقيم"; export header "رابط ملف وثيقة مقيم"; column `muqeem_document_url`; folder `muqeem-document`.
