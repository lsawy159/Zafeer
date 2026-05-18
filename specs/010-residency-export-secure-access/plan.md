# Implementation Plan: تصدير مسار صورة الإقامة وتأمين الوصول

**Branch**: `010-residency-export-secure-access` | **Date**: 2026-05-18 | **Spec**: [spec.md](spec.md)

---

## Summary

4 حذوفات في ملفين فقط:
- `TemplatesTab.tsx`: حذف عمود "رابط صورة الإقامة" من قالب الاستيراد
- `ImportTab.tsx`: حذف العمود من `EMPLOYEE_COLUMNS_ORDER`، `hiddenColumnNames`، وربط الحقل في mapping

التصدير (`ExportTab.tsx:654`) يعمل بالفعل — كان فارغاً لأن الموظفين لم يكن لديهم صور. لا تعديل مطلوب.

---

## Technical Context

**Language/Version**: TypeScript 5.x / React 18  
**Primary Dependencies**: xlsx (SheetJS)، Supabase JS client، React Query  
**Storage**: Supabase Storage — bucket `employee-documents` (خاص)، signed URLs (3600s)  
**Testing**: `pnpm run typecheck`  
**Target Platform**: Web browser (SPA — Vite/React)  
**Project Type**: Web application — تعديل frontend فقط  
**Performance Goals**: لا أثر — حذوفات فقط  
**Constraints**: لا DB migrations، لا API endpoints جديدة، لا proxy  
**Scale/Scope**: 743 موظف، 1 منهم لديه صورة مرفوعة

---

## Constitution Check

| المبدأ | Gate | الحالة |
|--------|------|--------|
| I — Supabase-First | لا REST layer جديد، Supabase client مباشر | ✅ PASS |
| II — Arabic UX RTL | لا تغيير في نصوص UI | ✅ PASS |
| III — Type Safety | حقول موجودة `string \| null` — لا `any` جديد | ✅ PASS |
| IV — Security RLS | RLS على `storage.objects` موجود ولا يُعدَّل | ✅ PASS |
| V — Monorepo | كل التعديلات في `artifacts/zafeer/src/` | ✅ PASS |
| VI — Brand Identity | لا معرّفات جديدة — تعديل كود قائم | ✅ PASS |
| VII — Users vs Employees | الوصول عبر `user_has_permission('employees', 'view')` — لا employee-scoping | ✅ PASS |

**جميع Gates تجتاز — لا Complexity Tracking مطلوب.**

---

## Project Structure

### Documentation (this feature)

```text
specs/010-residency-export-secure-access/
├── plan.md              ← هذا الملف
├── research.md          ← تأكيدات التحقيق الكودي + DB findings
├── data-model.md        ← توثيق الحقول (لا تغييرات DB)
├── quickstart.md        ← دليل التنفيذ (4 حذوفات)
└── tasks.md             ← يُنشأ بـ /speckit-tasks
```

### Source Code

```text
artifacts/zafeer/src/components/import-export/
├── TemplatesTab.tsx     ← حذف entry من template object (~L31)
├── ImportTab.tsx        ← حذف من EMPLOYEE_COLUMNS_ORDER (~L51)
│                           حذف من hiddenColumnNames (~L391)
│                           حذف من import mapping (~L1920)
└── ExportTab.tsx        ← لا تعديل (يعمل بالفعل، ~L654)
```

**لا ملفات جديدة. لا مجلدات جديدة.**

---

## Implementation Phases

### Phase 1: قالب الاستيراد — `TemplatesTab.tsx`

**الهدف**: إزالة عمود "رابط صورة الإقامة" من القالب المُولَّد  
**التغيير**: حذف `'رابط صورة الإقامة': ''` من السطر ~31  
**التحقق**: تحميل القالب → Excel بدون العمود

### Phase 2: محرك الاستيراد — `ImportTab.tsx`

**الهدف**: تجاهل عمود الإقامة كلياً عند الاستيراد  
**التغييرات الثلاثة**:

1. حذف `'رابط صورة الإقامة'` من `EMPLOYEE_COLUMNS_ORDER` (~L51)
2. حذف `'رابط صورة الإقامة'` من `hiddenColumnNames` (~L391)
3. حذف `residence_image_url: row['رابط صورة الإقامة'] || null` من import mapping (~L1920)

**التحقق**: استيراد ملف يحتوي العمود → لا خطأ + `residence_image_url` لا يُكتب

### Phase 3: تحقق من التصدير (Read-only)

**الهدف**: توثيق أن التصدير يعمل بالفعل  
**ExportTab.tsx:654**: `'رابط صورة الإقامة': emp.residence_image_url || ''`  
**الحالة**: صحيح — لا تعديل

---

## Acceptance Verification

```bash
# 1. TypeScript
pnpm run typecheck

# 2. اختبار يدوي
# - صفحة الاستيراد → قالب → Excel بدون عمود الإقامة
# - استيراد ملف قديم → نجاح بدون خطأ
# - تصدير موظف بصورة → مسار في الخانة
```
