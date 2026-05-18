# Quickstart: تصدير مسار صورة الإقامة وتأمين الوصول

**الوقت المتوقع للتنفيذ**: 15-20 دقيقة  
**الملفات المتأثرة**: 2 ملفات، 4 حذوفات

---

## التغييرات المطلوبة

### 1. حذف عمود الإقامة من قالب الاستيراد

**ملف**: `artifacts/zafeer/src/components/import-export/TemplatesTab.tsx`  
**السطر**: ~31

**قبل**:
```typescript
'رابط صورة الإقامة': '',
```

**بعد**: احذف هذا السطر كلياً.

---

### 2. حذف العمود من قائمة أعمدة الاستيراد

**ملف**: `artifacts/zafeer/src/components/import-export/ImportTab.tsx`  
**السطر**: ~51 (داخل `EMPLOYEE_COLUMNS_ORDER`)

**قبل**:
```typescript
'رابط صورة الإقامة',
```

**بعد**: احذف هذا السطر كلياً.

---

### 3. حذف العمود من قائمة الأعمدة المخفية

**ملف**: `artifacts/zafeer/src/components/import-export/ImportTab.tsx`  
**السطر**: ~391 (داخل `hiddenColumnNames`)

**قبل**:
```typescript
const hiddenColumnNames = ['الشركة أو المؤسسة', 'رابط صورة الإقامة']
```

**بعد**:
```typescript
const hiddenColumnNames = ['الشركة أو المؤسسة']
```

---

### 4. حذف ربط الحقل في محرك الاستيراد

**ملف**: `artifacts/zafeer/src/components/import-export/ImportTab.tsx`  
**السطر**: ~1920 (داخل object بناء بيانات الموظف من Excel)

**قبل**:
```typescript
residence_image_url: row['رابط صورة الإقامة'] || null,
```

**بعد**: احذف هذا السطر كلياً.

---

## التحقق (No-op)

**ملف**: `artifacts/zafeer/src/components/import-export/ExportTab.tsx`  
**السطر**: ~654

```typescript
'رابط صورة الإقامة': emp.residence_image_url || '',
```

هذا الكود **صحيح ويعمل بالفعل** — لا تعديل مطلوب.

---

## التحقق من الصحة بعد التنفيذ

```bash
pnpm run typecheck
```

يجب أن يمر بصفر أخطاء.

### اختبار يدوي

1. **قالب الاستيراد**: اذهب لصفحة الاستيراد → حمّل قالب → افتح Excel → تحقق من عدم وجود عمود "رابط صورة الإقامة"
2. **استيراد ملف قديم**: استورد ملف يحتوي العمود → يكتمل الاستيراد بدون خطأ، `residence_image_url` لا يتغير
3. **تصدير Excel**: صدّر موظف لديه `residence_image_url` → تحقق أن الخانة تحتوي المسار الصحيح
