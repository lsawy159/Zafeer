# Implementation Plan: رابط صورة الإقامة قابل للنقر في التصدير

**Branch**: `012-export-residence-clickable-url` | **Date**: 2026-05-19 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/012-export-residence-clickable-url/spec.md`

## Summary

`residence_image_url` يُخزَّن في DB كـ storage path خاص (`residence/uuid/file.ext`). عند التصدير لـ Excel يُكتب الـ raw path مما يجعل الخلية غير قابلة للفتح. الحل: قبل بناء بيانات Excel، نُولّد Signed URLs مؤقتة (صلاحية 7 أيام) بشكل batch عبر `supabase.storage.createSignedUrls()` ونستبدل الـ raw paths بها في مكانين: `ExportTab.tsx` و `ImportExport.tsx`.

## Technical Context

**Language/Version**: TypeScript (React 18 + Vite)  
**Primary Dependencies**: Supabase JS v2, SheetJS (xlsx), file-saver  
**Storage**: Supabase Storage — bucket `employee-documents` (private)  
**Testing**: vitest (موجود في المشروع)  
**Target Platform**: Web browser  
**Project Type**: Web application (SPA)  
**Performance Goals**: 100 موظف يُصدَّر في < 10 ثوان شاملاً توليد الروابط  
**Constraints**: Signed URL صلاحية 7 أيام (604800 ثانية)  
**Scale/Scope**: ~100–500 موظف per export

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Supabase-First | ✅ Pass | نستخدم Supabase client مباشرة من frontend — لا API layer |
| II. Arabic UX | ✅ Pass | لا تغيير على نصوص المستخدم |
| III. Type Safety | ✅ Pass | لا `any` غير مبرر — نستخدم type guards موجودة |
| IV. Security (RLS) | ✅ Pass | لا تغيير على RLS. Signed URLs تُولَّد client-side من session المستخدم المصادَق |
| V. Monorepo Discipline | ✅ Pass | لا packages جديدة. تعديل ملفين فقط في `artifacts/zafeer/` |
| VI. Brand Identity | ✅ Pass | لا legacy names |
| VII. Users vs Employees | ✅ Pass | employees = data records فقط، لا تغيير معماري |

**Post-Design Re-check**: ✅ لا انتهاكات — التغييرات تعديلات سطرية في دالتي تصدير موجودتين.

## Project Structure

### Documentation (this feature)

```text
specs/012-export-residence-clickable-url/
├── plan.md              ← هذا الملف
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit-tasks)
```

### Source Code (affected files)

```text
artifacts/zafeer/src/
├── components/import-export/
│   └── ExportTab.tsx          ← تعديل: دالة exportEmployees() سطر ~784–962
└── pages/
    └── ImportExport.tsx       ← تعديل: دالة exportAll() سطر ~26–102
```

**لا ملفات جديدة مطلوبة** — التغييرات سطرية في ملفين موجودين.

**Structure Decision**: Single project (artifacts/zafeer). لا حاجة لـ new lib/ packages أو backend changes.

## Implementation Approach

### في كلا الملفين، نفس النمط:

```
1. جمع storage paths → فلترة non-null + non-legacy
2. createSignedUrls(paths, 604800) → batch request واحد
3. بناء Map<path, signedUrl>
4. في row builder: استبدل raw path بـ signedUrl من الـ Map
```

### Imports المطلوبة (غير موجودة حالياً في الملفين)

```typescript
import { RESIDENCE_BUCKET, isLegacyExternalUrl } from '@/lib/residenceFile'
```

### معالجة الأخطاء

- `createSignedUrls` يعيد مصفوفة — كل عنصر قد يحمل `error != null`
- نتحقق من كل عنصر قبل إدراجه في الـ Map
- فشل موظف واحد → خلية فارغة، لا استثناء
- فشل الـ batch كله → نستمر في التصدير بخلايا فارغة (لا throw)

## Complexity Tracking

> لا انتهاكات للـ Constitution — لا يوجد جدول.
