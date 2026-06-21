# Wiring Contract: Muqeem Document — exact mirror sites

**Rule of thumb for the implementer**: everywhere the code currently handles `ajeer_contract_url` (or the `ajeer` registry key, or the header "رابط ملف عقد الأجير"), add a sibling for `muqeem_document_url` / `muqeem` / "رابط ملف وثيقة مقيم". **Never rewrite** the existing health/ajeer/residence blocks — only add a parallel block. Line numbers below are anchors at authoring time (2026-06-21); the implementer MUST locate the live anchor text, not trust the number.

Registry meta to use everywhere: `EMPLOYEE_DOC_TYPES.muqeem` (column `muqeem_document_url`, folder `muqeem-document`, labelAr `وثيقة مقيم`, exportHeaderAr `رابط ملف وثيقة مقيم`).

---

## 1. `supabase/migrations/20260621120000_070_add_employee_muqeem_document.sql` (NEW)
See [data-model.md](../data-model.md) — complete SQL. Timestamp must sort after 069's `20260621000000`.

## 2. `lib/db/src/schema/employees.ts`
After `ajeer_contract_url: text('ajeer_contract_url'),` add:
```ts
muqeem_document_url: text('muqeem_document_url'),
```

## 3. `artifacts/zafeer/src/lib/employeeDocFile.ts`
- Add `'muqeem_document_url'` to `EmployeeDocColumn`.
- Add `'muqeem-document'` to `EmployeeDocMeta.folder`.
- Add `muqeem` entry to `EMPLOYEE_DOC_TYPES` (and widen the `Record<'health' | 'ajeer'` key union to include `'muqeem'`).

## 4. `artifacts/zafeer/src/lib/supabase.ts`
After `ajeer_contract_url?: string` (~L95) add `muqeem_document_url?: string`.

## 5. `artifacts/zafeer/src/hooks/useEmployees.ts`
Both `.select(...)` strings (~L20, ~L71) that list `...,health_certificate_url,ajeer_contract_url,...` → append `,muqeem_document_url` adjacent to `ajeer_contract_url`.

## 6. `artifacts/zafeer/src/components/import-export/ExportTab.tsx`
Source select string (~L25) containing `residence_image_url,health_certificate_url,ajeer_contract_url,` → add `muqeem_document_url,` after `ajeer_contract_url,`. (This feeds `selectedData` in EmployeeExport.)

## 7. `artifacts/zafeer/src/components/import-export/ExportTab/EmployeeExport.tsx`
- **Path flatMap** (~L342-346): add `emp.muqeem_document_url,` to the array.
- **Row key** (~L421-426): after the `'رابط ملف عقد الأجير': (() => {...})()` block, add:
  ```ts
  'رابط ملف وثيقة مقيم': (() => {
    const p = emp.muqeem_document_url
    if (!p) return ''
    if (isLegacyExternalUrl(p)) return p
    return signedUrlMap.get(p) ?? ''
  })(),
  ```
  Placed **before** `الملاحظات:`.
- **linkHeaders** (~L456-460): add `{ header: 'رابط ملف وثيقة مقيم', label: 'اضغط هنا لعرض الملف', tooltip: 'فتح الملف' },`.
- **`!cols`** (~L486-502): append one `{ wch: 25 }` to BOTH the monthly and the basic arrays so the new link column gets a width (best-effort alignment; xlsx tolerates length mismatch).

## 8. `artifacts/zafeer/src/pages/ImportExport.tsx`
- Select string (~L55) → add `muqeem_document_url` after `ajeer_contract_url`.
- Storage-path col loop (~L66): `['residence_image_url', 'health_certificate_url', 'ajeer_contract_url']` → add `'muqeem_document_url'`.
- Row key (~L143-148): after the `'رابط ملف عقد الأجير'` block add the `'رابط ملف وثيقة مقيم'` block (same legacy/signed rule as site 7), before `الملاحظات`.

## 9. `artifacts/zafeer/src/components/employees/EmployeeCard/useEmployeeCardLogic.ts`
- `EmployeeFormData` (~L73): add `muqeem_document_url: string`.
- Init (~L113): `muqeem_document_url: employee?.muqeem_document_url ?? '',`.
- Pending refs/state (~L130-132): add `const pendingMuqeemRef = useRef<File | null>(null)` and `const [hasPendingMuqeem, setHasPendingMuqeem] = useState(false)`.
- Handler (~L139-142): add `function handleMuqeemReady(file: File) { pendingMuqeemRef.current = file; setHasPendingMuqeem(true) }`.
- handleSave (~L492-507): after the `pendingAjeerRef` block add a `pendingMuqeemRef` block using `uploadPendingDoc(pendingMuqeemRef.current, EMPLOYEE_DOC_TYPES.muqeem, formData.muqeem_document_url)` → `actualUpdateData['muqeem_document_url'] = newPath`, clear ref, `setHasPendingMuqeem(false)`, error toast 'فشل رفع ملف وثيقة مقيم'.
- handleCancel reset (~L625): add `muqeem_document_url: employee.muqeem_document_url || '',`.
- Export the new `handleMuqeemReady`, `hasPendingMuqeem` from the hook's return object (mirror how `handleAjeerReady`/`hasPendingAjeer` are exposed) so EmployeeCardInfo can consume them.

## 10. `artifacts/zafeer/src/components/employees/EmployeeCard/EmployeeCardInfo.tsx`
After the `{/* عقد الأجير */}` block (~L589-617) add a `{/* وثيقة مقيم */}` block: edit mode renders `<EmployeeDocumentField meta={EMPLOYEE_DOC_TYPES.muqeem} ... currentPath={formData.muqeem_document_url || null} onFileReady={handleMuqeemReady} onPathChange={(p)=>setFormData({...formData, muqeem_document_url: p ?? ''})} hasPendingFile={hasPendingMuqeem} />`; view mode renders label "وثيقة مقيم" + `<EmployeeDocViewer path={formData.muqeem_document_url} meta={EMPLOYEE_DOC_TYPES.muqeem} />` or "لا يوجد ملف". Pull `handleMuqeemReady`/`hasPendingMuqeem` from the logic hook destructure.

## 11. `artifacts/zafeer/src/components/employees/AddEmployeeModal.tsx`
After the `{/* عقد الأجير */}` `EmployeeDocumentField` (~L277-284) add a muqeem `EmployeeDocumentField` with `meta={EMPLOYEE_DOC_TYPES.muqeem}`, `employeeId=""`, `onFileReady={(file)=>setPendingMuqeem(file)}`, `hasPendingFile={!!pendingMuqeem}`. Change the wrapper grid (~L256) from `md:grid-cols-3` to a layout that fits 4 fields cleanly (`md:grid-cols-2`); verify visually.

## 12. `artifacts/zafeer/src/components/employees/AddEmployeeModal/useAddEmployeeForm.ts`
- Pending state (~L105): `const [pendingMuqeem, setPendingMuqeem] = useState<File | null>(null)`.
- Upload hook (~L111): `const uploadMuqeem = useUploadEmployeeDoc(EMPLOYEE_DOC_TYPES.muqeem)`.
- Post-insert select (~L441): add `muqeem_document_url` after `ajeer_contract_url`.
- Upload push (~L488-493): after the `pendingAjeer` push add `if (pendingMuqeem) { uploads.push({ label: 'وثيقة مقيم', fn: () => uploadMuqeem.mutateAsync({ employeeId: insertedEmployee.id, file: pendingMuqeem }) }) }`.
- Reset (~L523): add `setPendingMuqeem(null)`.
- Expose `pendingMuqeem`/`setPendingMuqeem` in the hook return if AddEmployeeModal reads them (mirror `pendingAjeer`).

## 13. `artifacts/zafeer/src/components/import-export/ImportTab/useImportBase.ts`
In `isColumnHidden` (~L353-354), after the ajeer line add:
```ts
if (normalized === normalizeColumnName('رابط ملف وثيقة مقيم')) return true
```

## 14. `artifacts/zafeer/tests/unit/lib/employeeDocFile.test.ts`
Add a `describe`/`it` mirroring the ajeer assertions: `EMPLOYEE_DOC_TYPES.muqeem.column === 'muqeem_document_url'`, `.folder === 'muqeem-document'`, `.labelAr === 'وثيقة مقيم'`, `.exportHeaderAr === 'رابط ملف وثيقة مقيم'`, and a `buildEmployeeDocPath(EMPLOYEE_DOC_TYPES.muqeem.folder, ...)` path-prefix check.

## 15. `artifacts/zafeer/tests/unit/hooks/useEmployeeDocFile.test.ts` (recommended)
Add an upload-success case writing `muqeem_document_url` (mirror the ajeer case ~L126-149). Optional but recommended for SC-005 parity.

---

## Verify-only (expect NO change)
- `artifacts/zafeer/src/components/import-export/TemplatesTab.tsx` — employee template fields contain no URL column. Confirm muqeem absent.
- `artifacts/zafeer/src/components/import-export/ImportTab/importTypes.ts` — `EMPLOYEE_COLUMNS_ORDER` contains no URL column. Confirm muqeem absent.
- `lib/residenceFile.ts`, `hooks/useResidenceFile.ts`, `ResidenceFileField.tsx`, `ResidenceCropModal*` — untouched (SC-005).

## Acceptance gate before "done"
1. `pnpm run typecheck` → 0 errors.
2. Unit tests pass (incl. new muqeem assertions).
3. Migration applied; `muqeem_document_url` column exists.
4. Manual: upload via edit + add, reload → viewable; export shows clickable "رابط ملف وثيقة مقيم"; import of an exported file hides the column with no blocking error; residence + health/ajeer unchanged; card avatar unchanged.
