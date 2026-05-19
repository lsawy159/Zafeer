# Tasks: رابط صورة الإقامة قابل للنقر في التصدير

**Input**: Design documents from `specs/012-export-residence-clickable-url/`  
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | quickstart.md ✅

**Tests**: لا tests مطلوبة (غير مذكورة في الـ spec) — typecheck يكفي كـ validation.

**Organization**: مهمتان رئيسيتان، كل ملف مستقل بذاته.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: لا setup مطلوب — مشروع موجود، لا ملفات جديدة، لا packages جديدة.

*No tasks — skip to Phase 2*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: `RESIDENCE_BUCKET` و`isLegacyExternalUrl` موجودان في `@/lib/residenceFile` — لا حاجة لبناء أي foundation.

*No tasks — skip to Phase 3*

---

## Phase 3: User Story 1 — تصدير موظفين محددين برابط قابل للنقر (Priority: P1) 🎯 MVP

**Goal**: دالة `exportEmployees()` في `ExportTab.tsx` تكتب Signed URL صالح لـ 7 أيام بدلاً من storage path خام.

**Independent Test**: صدّر موظفاً واحداً لديه `residence_image_url`، افتح Excel، اضغط الخلية → يفتح الملف في المتصفح مباشرة.

### Implementation for User Story 1

- [ ] T001 [US1] أضف `import { RESIDENCE_BUCKET, isLegacyExternalUrl } from '@/lib/residenceFile'` في أعلى `artifacts/zafeer/src/components/import-export/ExportTab.tsx`

- [ ] T002 [US1] في دالة `exportEmployees()` بعد تعريف `selectedData` (السطر ~793) وقبل بناء `excelData`، أضف كتلة توليد Signed URLs في `artifacts/zafeer/src/components/import-export/ExportTab.tsx`:
  ```typescript
  const storagePaths = selectedData
    .map((emp) => emp.residence_image_url)
    .filter((p): p is string => !!p && !isLegacyExternalUrl(p))

  const signedUrlMap = new Map<string, string>()
  if (storagePaths.length > 0) {
    // تقسيم لدفعات 100 (FR-005)
    for (let i = 0; i < storagePaths.length; i += 100) {
      const chunk = storagePaths.slice(i, i + 100)
      const { data: signedResults, error: signErr } = await supabase.storage
        .from(RESIDENCE_BUCKET)
        .createSignedUrls(chunk, 604800)
      if (signErr) {
        toast.warning('تعذّر توليد روابط صور الإقامة — سيُصدَّر الملف بدونها')
        break
      }
      if (signedResults) {
        for (const result of signedResults) {
          if (result.signedUrl && result.path && !result.error) {
            signedUrlMap.set(result.path, result.signedUrl)
          }
        }
      }
    }
  }
  ```

- [ ] T003 [US1] في نفس الملف، عدّل السطر ~939 داخل `excelData.map()` في `artifacts/zafeer/src/components/import-export/ExportTab.tsx`:
  ```typescript
  // استبدل:
  'رابط صورة الإقامة': emp.residence_image_url || '',

  // بـ:
  'رابط صورة الإقامة': (() => {
    const p = emp.residence_image_url
    if (!p) return ''
    if (isLegacyExternalUrl(p)) return p
    return signedUrlMap.get(p) ?? ''
  })(),
  ```

**Checkpoint**: تصدير موظفين محددين يعطي Signed URLs قابلة للفتح ✅

---

## Phase 4: User Story 2 — تصدير الكل برابط قابل للنقر وصلاحية 7 أيام (Priority: P2)

**Goal**: دالة `exportAll()` في `ImportExport.tsx` تكتب Signed URL صالح لـ 7 أيام بدلاً من storage path خام.

**Independent Test**: اضغط "تصدير الكل" من صفحة الاستيراد/التصدير، افتح الـ Excel → خلايا "رابط صورة الإقامة" تحتوي روابط `https://` قابلة للفتح.

### Implementation for User Story 2

- [ ] T004 [US2] أضف `import { RESIDENCE_BUCKET, isLegacyExternalUrl } from '@/lib/residenceFile'` في أعلى `artifacts/zafeer/src/pages/ImportExport.tsx`

- [ ] T005 [US2] في دالة `exportAll()` بعد `if (empErr) throw empErr` (السطر ~48) وقبل `const empData = employees.map(...)`, أضف كتلة توليد Signed URLs في `artifacts/zafeer/src/pages/ImportExport.tsx`:
  ```typescript
  const empStoragePaths = (rawEmp ?? [])
    .map((e) => (e as Record<string, unknown>).residence_image_url as string | null)
    .filter((p): p is string => !!p && !isLegacyExternalUrl(p))

  const exportSignedUrlMap = new Map<string, string>()
  if (empStoragePaths.length > 0) {
    // تقسيم لدفعات 100 (FR-005)
    for (let i = 0; i < empStoragePaths.length; i += 100) {
      const chunk = empStoragePaths.slice(i, i + 100)
      const { data: signedResults, error: signErr } = await supabase.storage
        .from(RESIDENCE_BUCKET)
        .createSignedUrls(chunk, 604800)
      if (signErr) {
        toast.warning('تعذّر توليد روابط صور الإقامة — سيُصدَّر الملف بدونها')
        break
      }
      if (signedResults) {
        for (const result of signedResults) {
          if (result.signedUrl && result.path && !result.error) {
            exportSignedUrlMap.set(result.path, result.signedUrl)
          }
        }
      }
    }
  }
  ```

- [ ] T006 [US2] في نفس الملف، عدّل السطر ~87 داخل `employees.map()` في `artifacts/zafeer/src/pages/ImportExport.tsx`:
  ```typescript
  // استبدل:
  'رابط صورة الإقامة': emp.residence_image_url ?? '',

  // بـ:
  'رابط صورة الإقامة': (() => {
    const p = emp.residence_image_url as string | null | undefined
    if (!p) return ''
    if (isLegacyExternalUrl(p)) return p
    return exportSignedUrlMap.get(p) ?? ''
  })(),
  ```

**Checkpoint**: "تصدير الكل" يعطي Signed URLs لجميع الموظفين، صالحة 7 أيام ✅

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: التحقق من سلامة الأنواع والمنطق

- [ ] T007 شغّل typecheck: `pnpm --filter @workspace/zafeer run typecheck` من جذر المشروع وتأكد أن لا أخطاء
- [ ] T008 تحقق يدوي حسب `specs/012-export-residence-clickable-url/quickstart.md`: صدّر موظفاً لديه صورة إقامة، افتح Excel، اضغط الرابط → يفتح في المتصفح

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1-2**: مُتجاوَزتان — لا prerequisites
- **Phase 3 (US1)**: تبدأ مباشرة — T001 → T002 → T003
- **Phase 4 (US2)**: تبدأ بعد أو بالتوازي مع Phase 3 — T004 → T005 → T006
- **Phase 5**: بعد اكتمال Phase 3 و Phase 4

### User Story Dependencies

- **US1 (Phase 3)**: مستقلة — لا تعتمد على US2
- **US2 (Phase 4)**: مستقلة — يمكن تنفيذها بالتوازي مع US1

### Within Each User Story

- T001 (import) → T002 (توليد URLs) → T003 (استخدام الـ Map)
- T004 (import) → T005 (توليد URLs) → T006 (استخدام الـ Map)

### Parallel Opportunities

- US1 و US2 (Phase 3 & 4) يمكن تنفيذهما بالتوازي (ملفان مختلفان)
- T001 و T004 يمكن تنفيذهما بالتوازي [P]

---

## Parallel Example

```bash
# Phase 3 و 4 يمكن تنفيذهما بالتوازي:
Task: T001-T003 in artifacts/zafeer/src/components/import-export/ExportTab.tsx
Task: T004-T006 in artifacts/zafeer/src/pages/ImportExport.tsx
```

---

## Implementation Strategy

### MVP First (US1 فقط)

1. نفّذ Phase 3 (T001 → T002 → T003)
2. شغّل typecheck
3. **توقف وتحقق**: صدّر موظفاً محدداً → رابط يفتح ✅
4. انتقل لـ Phase 4

### Incremental Delivery

1. Phase 3 → اختبر ExportTab → نجح ✅
2. Phase 4 → اختبر exportAll → نجح ✅
3. Phase 5 → typecheck + manual validation → شحن ✅

---

## Notes

- لا ملفات جديدة — تعديلات سطرية في ملفين موجودين فقط
- `RESIDENCE_BUCKET = 'employee-documents'` موجود في `lib/residenceFile.ts`
- `createSignedUrls` (جمع) من Supabase JS v2 يدعم batch
- الصلاحية: 604800 ثانية = 7 أيام (FR-002)
- فشل رابط واحد → خلية فارغة، لا throw (FR-006)
- موظف بدون `residence_image_url` → خلية فارغة (FR-004)
- Legacy URL (http/https) → يُكتب كما هو (FR-003)
