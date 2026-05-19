# Quickstart: تنفيذ رابط صورة الإقامة في التصدير

## الخطوات بالترتيب

### 1. ExportTab.tsx — دالة `exportEmployees` (السطر ~784)

**أضف import** في أعلى الملف:
```typescript
import { RESIDENCE_BUCKET, isLegacyExternalUrl } from '@/lib/residenceFile'
```

**أضف بعد بناء `selectedData`** وقبل بناء `excelData`:
```typescript
// توليد Signed URLs للموظفين الذين لديهم storage path
const storagePaths = selectedData
  .map((emp) => emp.residence_image_url)
  .filter((p): p is string => !!p && !isLegacyExternalUrl(p))

const signedUrlMap = new Map<string, string>()
if (storagePaths.length > 0) {
  const { data: signedResults } = await supabase.storage
    .from(RESIDENCE_BUCKET)
    .createSignedUrls(storagePaths, 604800) // 7 أيام
  if (signedResults) {
    for (const result of signedResults) {
      if (result.signedUrl && !result.error) {
        signedUrlMap.set(result.path, result.signedUrl)
      }
    }
  }
}
```

**عدّل السطر 939:**
```typescript
// قبل
'رابط صورة الإقامة': emp.residence_image_url || '',

// بعد
'رابط صورة الإقامة': (() => {
  const p = emp.residence_image_url
  if (!p) return ''
  if (isLegacyExternalUrl(p)) return p
  return signedUrlMap.get(p) ?? ''
})(),
```

### 2. ImportExport.tsx — دالة `exportAll` (السطر ~26)

**أضف import:**
```typescript
import { RESIDENCE_BUCKET, isLegacyExternalUrl } from '@/lib/residenceFile'
```

**أضف بعد جلب `rawEmp`** وقبل `empData.map(...)`:
```typescript
const empStoragePaths = (employees as Array<Record<string, unknown>>)
  .map((e) => e.residence_image_url as string | null)
  .filter((p): p is string => !!p && !isLegacyExternalUrl(p))

const exportSignedUrlMap = new Map<string, string>()
if (empStoragePaths.length > 0) {
  const { data: signedResults } = await supabase.storage
    .from(RESIDENCE_BUCKET)
    .createSignedUrls(empStoragePaths, 604800)
  if (signedResults) {
    for (const result of signedResults) {
      if (result.signedUrl && !result.error) {
        exportSignedUrlMap.set(result.path, result.signedUrl)
      }
    }
  }
}
```

**عدّل السطر 87:**
```typescript
// قبل
'رابط صورة الإقامة': emp.residence_image_url ?? '',

// بعد
'رابط صورة الإقامة': (() => {
  const p = emp.residence_image_url as string | null | undefined
  if (!p) return ''
  if (isLegacyExternalUrl(p)) return p
  return exportSignedUrlMap.get(p) ?? ''
})(),
```

## الاختبار اليدوي

1. افتح صفحة استيراد/تصدير
2. اختر موظفاً لديه صورة إقامة (`residence_image_url` يبدأ بـ `residence/`)
3. صدّر إلى Excel
4. افتح الملف → اضغط على خلية "رابط صورة الإقامة" → يجب أن يفتح الملف مباشرة
5. تأكد أن الرابط يبدأ بـ `https://` وليس `residence/`

## تنشيط typecheck

```bash
pnpm --filter @workspace/zafeer run typecheck
```
