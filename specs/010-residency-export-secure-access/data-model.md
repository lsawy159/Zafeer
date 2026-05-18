# Data Model: تصدير مسار صورة الإقامة وتأمين الوصول

**Branch**: `010-residency-export-secure-access`  
**DB Changes**: لا تغييرات — الحقول قائمة

---

## الحقول المعنية (جدول `employees`)

| الحقل | النوع | القيد | الوصف |
|-------|-------|-------|-------|
| `residence_image_url` | `TEXT` | nullable | مسار نسبي داخل bucket `employee-documents` بصيغة `residence/{id}/{ts}.{ext}` |
| `residence_thumbnail_url` | `TEXT` | nullable | مسار thumbnail المصغّر — غير مُصدَّر في Excel |

## Supabase Storage

| المعامل | القيمة |
|---------|--------|
| Bucket | `employee-documents` |
| Public | `false` |
| حجم أقصى | 500 KB |
| MIME مسموحة | `image/jpeg`, `image/png`, `image/webp`, `application/pdf` |
| RLS - SELECT | `user_has_permission('employees', 'view')` |
| RLS - INSERT/UPDATE/DELETE | `user_has_permission('employees', 'edit')` |

## صيغة المسار

```
residence/{employee_id}/{timestamp}.{ext}
```

مثال: `residence/550e8400-e29b-41d4-a716-446655440000/1715833200000.jpg`

## حالة البيانات الراهنة (2026-05-18)

- موظفون بصور مرفوعة: **1**
- موظفون بدون صور: **742**
- روابط legacy (http/https): **0**

## لا migration مطلوب

هذه الميزة تعديل UI فقط — لا DDL، لا schema changes، لا seed data.
