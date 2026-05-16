# Phase 1 — Data Model: ملف الإقامة للموظف

## نظرة عامة

لا جداول جديدة. لا أعمدة جديدة. الميزة تُعيد استخدام عمود موجود + bucket تخزين جديد.

## كيان: الموظف (employees) — عمود مُعاد استخدامه

| العمود | النوع | الحالة | الوصف |
|--------|-------|--------|-------|
| `residence_image_url` | `text` (nullable) | موجود مسبقاً | يُخزَّن فيه **مسار object** ملف الإقامة داخل bucket `employee-documents` |

- لا migration على جدول `employees`.
- قيمة `null` أو فارغة = لا يوجد ملف إقامة.
- القيمة الجديدة = مسار نسبي مثل `residence/{employee_id}/{timestamp}.{ext}`.
- **توافق رجعي**: قيمة تبدأ بـ `http://`/`https://` = رابط خارجي قديم، تُعرَض كما هي.

## مورد تخزين جديد: Bucket `employee-documents`

| الخاصية | القيمة |
|---------|--------|
| الاسم | `employee-documents` |
| `public` | `false` (خاص) |
| `file_size_limit` | `500KB` (512000 بايت) |
| `allowed_mime_types` | `image/jpeg`, `image/png`, `image/webp`, `application/pdf` |

### بنية المسار داخل الـ bucket

```text
residence/{employee_id}/{timestamp}.{ext}
```

- `employee_id` — UUID الموظف (يربط الملف بالموظف الصحيح، FR-005).
- `timestamp` — Unix ms وقت الرفع (يضمن اسماً فريداً عند الاستبدال).
- `ext` — `jpg` | `jpeg` | `png` | `webp` | `pdf`.

## نوع منطقي مشتقّ (لا يُخزَّن)

```ts
type ResidenceFileKind = 'image' | 'pdf'
```

- يُشتقّ من امتداد المسار في `residence_image_url`:
  - `.pdf` → `'pdf'`
  - `.jpg` / `.jpeg` / `.png` / `.webp` → `'image'`

## قواعد التحقق (Validation Rules)

من المتطلبات الوظيفية في [spec.md](./spec.md):

| القاعدة | المصدر | الطبقة |
|---------|--------|--------|
| الحجم ≤ 500 KB (512000 بايت، شامل) | FR-003 | العميل + الـ bucket |
| النوع ∈ {JPEG, PNG, WebP, PDF} | FR-004 | العميل + الـ bucket |
| ملف 0 بايت يُرفض | Edge Cases | العميل |
| ملف واحد فقط لكل موظف | Assumptions | منطق الواجهة (الاستبدال يحلّ محل القديم) |
| موظف `is_deleted = true` → لا رفع | Edge Cases | منطق الواجهة |

## انتقالات الحالة (State Transitions)

```text
[لا ملف]  --رفع ملف صالح-->  [يوجد ملف (صورة|PDF)]
[يوجد ملف]  --رفع ملف بديل-->  [يوجد ملف جديد]   (يُحذف القديم من الـ bucket)
[يوجد ملف]  --حذف + تأكيد-->   [لا ملف]          (يُحذف object + تُمسح قيمة العمود)
```

- عند الاستبدال/الحذف: يُحدَّث `residence_image_url` فقط بعد نجاح عملية الـ Storage (FR-011 / SC-004).
- فشل رفع object → لا تُكتب أي قيمة جديدة في العمود (لا سجل جزئي).

## العلاقات

- `storage.objects` (داخل bucket `employee-documents`) ←→ `employees` عبر `employee_id`
  المضمَّن في المسار. **لا foreign key** من `employees` إلى `storage`/`auth` (Principle VII).
