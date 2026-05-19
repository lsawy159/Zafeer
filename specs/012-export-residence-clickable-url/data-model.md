# Data Model: رابط صورة الإقامة في التصدير

**Date**: 2026-05-19

## التغييرات على البيانات

**لا تغييرات على Schema أو DB** — هذه ميزة تعالج البيانات وقت التصدير فقط.

## البيانات المُعالَجة

### المدخل
```
emp.residence_image_url: string | null
```
- `null` أو `''` → خلية فارغة في Excel
- يبدأ بـ `http://` أو `https://` (legacy) → يُكتب كما هو
- يبدأ بـ `residence/` (storage path) → يُولَّد له Signed URL

### المخرج (في خلية Excel)
```
'رابط صورة الإقامة': signedUrl | legacyUrl | ''
```

## التدفق داخل ExportTab.tsx

```
exportEmployees()
  ├── جمع paths الموظفين المحددين الذين لديهم storage path
  ├── createSignedUrls(paths, 604800)  ← 7 أيام
  ├── بناء Map<storagePath, signedUrl>
  └── excelData.map(emp => { 'رابط صورة الإقامة': resolveUrl(emp, signedUrlMap) })
```

## دالة مساعدة مقترحة

```typescript
function resolveResidenceUrl(
  path: string | null | undefined,
  signedUrlMap: Map<string, string>
): string {
  if (!path) return ''
  if (isLegacyExternalUrl(path)) return path
  return signedUrlMap.get(path) ?? ''
}
```
