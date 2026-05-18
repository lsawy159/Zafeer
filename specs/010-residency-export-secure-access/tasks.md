---
description: "Task list for feature: تصدير مسار صورة الإقامة وتأمين الوصول"
---

# Tasks: تصدير مسار صورة الإقامة وتأمين الوصول

**Input**: Design documents from `specs/010-residency-export-secure-access/`  
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | quickstart.md ✅  
**Tests**: لا اختبارات آلية مطلوبة — اختبار يدوي فقط (لا specs تطلب TDD)

**Organization**: 4 حذوفات في ملفين + تحقق من ملف ثالث.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: يمكن تشغيله بالتوازي (ملفات مختلفة)
- **[Story]**: القصة المرتبطة بالمهمة

---

## Phase 1: User Story 1 — تأكيد صحة التصدير (Priority: P1) 🎯

**Goal**: التحقق أن `ExportTab.tsx` يصدّر مسار الإقامة بشكل صحيح دون أي تعديل كودي.

**Independent Test**: صدّر Excel لموظف لديه `residence_image_url` → تحقق أن خانة "رابط صورة الإقامة" تحتوي على المسار النسبي.

### Implementation

- [x] T001 [US1] افحص `artifacts/zafeer/src/components/import-export/ExportTab.tsx` السطر ~654 وتحقق أن `'رابط صورة الإقامة': emp.residence_image_url || ''` موجود ولم يتغير — لا تعديل مطلوب

**Checkpoint**: التصدير يعمل بالفعل — انتقل للـ Phase 4.

---

## Phase 2: User Story 2 — حذف عمود الإقامة من قالب الاستيراد ومحركه (Priority: P1)

**Goal**: إزالة عمود "رابط صورة الإقامة" من قالب الاستيراد ومن جميع مراحل معالجة الاستيراد.

**Independent Test**: حمّل قالب الاستيراد → افتح Excel → لا يوجد عمود "رابط صورة الإقامة". استورد ملف يحتوي العمود → نجاح الاستيراد بدون خطأ.

### Implementation

- [x] T002 [P] [US2] احذف `'رابط صورة الإقامة': '',` من `artifacts/zafeer/src/components/import-export/TemplatesTab.tsx` السطر ~31
- [x] T003 [P] [US2] احذف `'رابط صورة الإقامة',` من `EMPLOYEE_COLUMNS_ORDER` في `artifacts/zafeer/src/components/import-export/ImportTab.tsx` السطر ~51
- [x] T004 [US2] احذف `'رابط صورة الإقامة'` من `hiddenColumnNames` في `artifacts/zafeer/src/components/import-export/ImportTab.tsx` السطر ~391 (يعتمد على T003)
- [x] T005 [US2] احذف `residence_image_url: row['رابط صورة الإقامة'] || null,` من import mapping في `artifacts/zafeer/src/components/import-export/ImportTab.tsx` السطر ~1920 (يعتمد على T003)

**Checkpoint**: قالب الاستيراد بدون عمود الإقامة + استيراد أي ملف (قديم أو جديد) يتجاهل العمود كلياً.

---

## Phase 3: User Story 3 — توثيق آلية الوصول الآمن (Priority: P2)

**Goal**: التحقق أن آلية الوصول الآمن لملفات الإقامة تعمل بشكل صحيح (signed URLs + RLS).

**Independent Test**: حاول الوصول لملف إقامة بدون مصادقة → رفض. وصول مصادق بصلاحية `employees.view` → نجاح.

### Implementation

- [x] T006 [US3] افحص `artifacts/zafeer/src/hooks/useResidenceFile.ts` السطر ~118-139 وتحقق أن `useResidenceSignedUrl()` موجود ويولّد روابط موقّعة 3600s — لا تعديل مطلوب

**Checkpoint**: الوصول الآمن مكفول بـ Supabase RLS + signed URLs الموجودة.

---

## Phase 4: Polish & Verification

**Purpose**: التحقق النهائي من صحة جميع التعديلات.

- [x] T007 شغّل `pnpm run typecheck` من `artifacts/zafeer/` وتأكد صفر أخطاء TypeScript
- [ ] T008 اختبار يدوي للتصدير: صدّر موظف لديه `residence_image_url` → تحقق من الخانة في Excel
- [ ] T009 اختبار يدوي للقالب: حمّل قالب الاستيراد → تحقق من غياب عمود "رابط صورة الإقامة"
- [ ] T010 اختبار يدوي للاستيراد: استورد ملف يحتوي عمود الإقامة → اكتمال بدون خطأ

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (US1)**: مستقلة — تحقق قراءة فقط، لا تعديل
- **Phase 2 (US2)**: مستقلة — T002 و T003 يمكن تشغيلهما بالتوازي (ملفات مختلفة)
- **Phase 3 (US3)**: مستقلة — تحقق قراءة فقط، لا تعديل
- **Phase 4**: تعتمد على اكتمال T002-T005

### User Story Dependencies

- **US1 (P1)**: لا اعتماد على US2 أو US3 — فحص مستقل
- **US2 (P1)**: لا اعتماد على US1 أو US3 — تعديلات مستقلة
  - داخل US2: T003 يُكمَل قبل T004 و T005 (نفس الملف)
- **US3 (P2)**: لا اعتماد على US1 أو US2 — فحص مستقل

### Parallel Opportunities

- T002 (TemplatesTab) و T003 (ImportTab) يمكن تشغيلهما معاً [P]
- T001 و T006 فحوصات قراءة فقط — يمكن تشغيلهما في أي وقت

---

## Parallel Example: Phase 2 (US2)

```text
# في نفس الوقت:
T002: احذف entry من TemplatesTab.tsx
T003: احذف entry من EMPLOYEE_COLUMNS_ORDER في ImportTab.tsx

# بعدها بالترتيب:
T004: احذف من hiddenColumnNames في ImportTab.tsx
T005: احذف من import mapping في ImportTab.tsx
```

---

## Implementation Strategy

### MVP (User Story 2 فقط — التغيير الفعلي)

1. نفّذ T002-T005 (4 حذوفات)
2. شغّل T007 (typecheck)
3. **توقف واختبر**: T009 و T010 (قالب + استيراد)

### Complete Delivery

1. T001 — تأكيد التصدير (فحص)
2. T002-T005 — التعديلات الفعلية
3. T006 — تأكيد الوصول الآمن (فحص)
4. T007-T010 — تحقق نهائي

---

## Notes

- [P] tasks = ملفات مختلفة، لا تعارض
- T001 و T006 فحوصات قراءة فقط — لا كود يُكتب
- T003 يجب أن يُكمَل قبل T004 و T005 (نفس الملف)
- المهام الفعلية: T002-T005 فقط (4 حذوفات)
- `pnpm run typecheck` يجب أن يمر بصفر أخطاء قبل الإغلاق
