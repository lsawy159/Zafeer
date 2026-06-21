# Phase 1 Data Model: Employee Muqeem Document

## Entity: `employees` (existing table — additive change)

One new optional column. No constraints beyond nullability. No index.

| Column | Type | Null | Default | Meaning |
|--------|------|------|---------|---------|
| `muqeem_document_url` | `text` | YES | `NULL` | Storage object path (or legacy external URL) of the employee's Muqeem Document ("وثيقة مقيم"). |

Existing related columns (reference, unchanged): `residence_image_url`, `residence_thumbnail_url`, `health_certificate_url`, `ajeer_contract_url`.

### Value semantics
- Stored value is a **storage object path** within bucket `employee-documents`, e.g. `muqeem-document/{employeeId}/{epochMs}.pdf`.
- A value beginning with `http://` or `https://` is a **legacy external URL** — handled by `isLegacyExternalUrl` (linked directly, never signed, never deleted from storage).
- `NULL` / empty = no document attached.

### Validation rules (app layer — reuses `validateEmployeeDocFile`)
- File size: `> 0` and `≤ 512000` bytes (500 KB).
- MIME ∈ { `image/jpeg`, `image/png`, `image/webp`, `application/pdf` }.
- Arabic error messages identical to 069 (empty / size / type).

### State transitions (per column — reuses `useEmployeeDocFile` + handleSave logic)
```
NULL ──upload──▶ <path>
<path> ──replace──▶ <newPath>   (old object removed AFTER new reference saved)
<path> ──delete──▶ NULL          (object removed, then column set NULL)
```
Reference written only after a successful storage upload (FR-006). On row-update failure after upload, the newly uploaded object is removed (rollback — existing hook behavior).

## Registry extension (`artifacts/zafeer/src/lib/employeeDocFile.ts`)

```ts
// 1) union
export type EmployeeDocColumn =
  | 'health_certificate_url'
  | 'ajeer_contract_url'
  | 'muqeem_document_url'

// 2) folder union on EmployeeDocMeta
folder: 'health-certificate' | 'ajeer-contract' | 'muqeem-document'

// 3) registry key (Record<'health' | 'ajeer' | 'muqeem', EmployeeDocMeta>)
muqeem: {
  column: 'muqeem_document_url',
  folder: 'muqeem-document',
  labelAr: 'وثيقة مقيم',
  exportHeaderAr: 'رابط ملف وثيقة مقيم',
},
```
`validateEmployeeDocFile` and `buildEmployeeDocPath` are type-generic over `EmployeeDocMeta` and need no change.

## Drizzle schema change

In `lib/db/src/schema/employees.ts`, inside `employeesTable`, after `ajeer_contract_url` (line 30):

```ts
ajeer_contract_url: text('ajeer_contract_url'),
muqeem_document_url: text('muqeem_document_url'),
```
`insertEmployeeSchema` / `selectEmployeeSchema` / `Employee` inference pick it up automatically (drizzle-zod).

## Migration (complete SQL)

File: `supabase/migrations/20260621120000_070_add_employee_muqeem_document.sql`
(`20260621120000` = a UTC timestamp strictly greater than the 069 migration `20260621000000`; adjust to the actual creation time if later, keeping it after 069.)

```sql
-- 070: وثيقة مقيم — مرفق مستندي إضافي للموظف
-- مرفق مستندي فقط — لا يُستخدم لاستخراج صورة/أفاتار للموظف.
-- يُخزَّن في نفس bucket: employee-documents (سياسات RLS الحالية تغطيه — لا حاجة لسياسة جديدة).
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS muqeem_document_url TEXT;
```

No bucket creation, no storage policy, no backfill required.

## TypeScript type (`artifacts/zafeer/src/lib/supabase.ts`)

`Employee` interface gains, after `ajeer_contract_url?: string` (line 95):
```ts
muqeem_document_url?: string
```

## EmployeeFormData (`useEmployeeCardLogic.ts`)

`EmployeeFormData` gains (after `ajeer_contract_url: string`):
```ts
muqeem_document_url: string
```
Initialized from `employee?.muqeem_document_url ?? ''` (init block) and `employee.muqeem_document_url || ''` (handleCancel reset), mirroring health/ajeer.
