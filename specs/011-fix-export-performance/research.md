# Research: إصلاح تهنيج تصدير الموظفين

**Branch**: `011-fix-export-performance` | **Date**: 2026-05-18

---

## التشخيص الجذري

### Decision: السبب الجذري

**Root Cause #1 — Double DOM rendering:**
- سطر 1251 في `ExportTab.tsx`: `hidden lg:block` (جدول الديسكتوب)
- سطر 1419: `lg:hidden` (كروت الموبايل)
- CSS `hidden` = `display: none` فقط — **كلا العرضين موجودان في الـ DOM معاً**
- مع 300 موظف: 300 صف جدول + 300 كرت موبايل = **600 عنصر React يُرسَم في كل state change**

**Root Cause #2 — Expensive inline computations on every render:**
- كل صف في الجدول (4 أعمدة تاريخ): IIFE داخل JSX تستدعي:
  - `getDaysRemaining()` ← `differenceInDays(new Date(date), new Date())`
  - `formatDateShortWithHijri()` ← parsing + formatting
  - `getDateTextColor()` + `formatDateStatus()`
- مع 300 موظف × 4 تواريخ × 2 views = **2400 حساب** في كل render

**Root Cause #3 — لا `React.memo` على الصفوف:**
- تغيير `employeeExportMode` (select box) يُعيد رسم ExportTab بالكامل
- كل صفوف الجدول + كل الكروت تُعيد الحساب رغم أن قائمة الموظفين **لم تتغير**

### Rationale
`employeeExportMode` يؤثر فقط على:
1. قيمة الـ `<select>`
2. ظهور month picker
3. منطق التصدير الفعلي عند الضغط على زر التصدير

**لا يؤثر على عرض القائمة إطلاقاً** — لذا إعادة رسم القائمة عند تغييره هو낭낭낭 낭낭낭.

### Alternatives Considered

| البديل | المزايا | المخاطر | القرار |
|--------|---------|---------|--------|
| `React.memo` + `useMemo` (المقترح) | سريع، بدون مكتبات جديدة | يحتاج تغيير هيكلي داخل ExportTab | **مختار** |
| Virtualization (`@tanstack/virtual`) | يحل مشاكل 1000+ موظف | إضافة dependency، تغيير أكبر | مرجأ (مستقبلاً إذا احتاج) |
| Pagination للقائمة | يقلل عدد العناصر | يغير UX — المستخدم يريد "تحديد الكل" | مرفوض |
| `useMediaQuery` لتجنب double DOM | يحل Root Cause #1 تماماً | يحتاج hook جديد أو مكتبة | **اختياري** (React.memo يكفي للـ P0 fix) |

---

## القرارات التقنية

### D-001: React.memo للصفوف كمكونات منفصلة

**المختار:** استخراج `EmployeeTableRow` و `EmployeeCardItem` كـ `React.memo` components خارج `ExportTab`.

**الآلية:**
- عند تغيير `employeeExportMode`: ExportTab يُعيد الرسم → `React.memo` يقارن props الصفوف → props ما تغيرت → **يتخطى رسم كل الصفوف**
- عند تحديد موظف واحد: فقط الصف الذي تغير `isSelected` بوله يُعاد رسمه

### D-002: useMemo لـ employeeDisplayData

**المختار:** precompute حسابات التاريخ لكل موظف مرة واحدة via `useMemo` مربوط بـ `filteredEmployees`.

```typescript
const employeeDisplayData = useMemo(() =>
  new Map(filteredEmployees.map(emp => [emp.id, computeEmployeeDisplayData(emp, today)])),
  [filteredEmployees, today]
)
```

**النتيجة:** عند تغيير `employeeExportMode` → `filteredEmployees` ثابتة → `employeeDisplayData` ثابتة → props الصفوف ثابتة → `React.memo` يتخطى كل شيء.

### D-003: useCallback لـ toggle handlers

**المختار:** `handleToggleEmployee` و `handleToggleAllEmployees` كـ `useCallback` مع functional state updates.

```typescript
const handleToggleEmployee = useCallback((id: string) => {
  setSelectedEmployees(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
}, []) // stable reference — no deps
```

**لماذا مهم:** `React.memo` يتخطى إذا props ثابتة — إذا كانت `onToggle` مرجع جديد في كل render، `React.memo` ينكسر.

### D-004: today كـ useMemo يومي

**المختار:**
```typescript
const today = useMemo(() => new Date(), [])
```

يُحسب مرة واحدة عند mount الـ component. كافٍ لأن التاريخ لا يتغير خلال جلسة الاستخدام.

### D-005: نقل helper functions خارج الـ component

**المختار:** نقل `isExpired`, `isExpiringWithin30Days`, `getDaysRemaining`, `getDateTextColor`, `formatDateStatus`, `STATUS_THRESHOLDS` إلى module-level.

**لماذا:** هذه دوال بحتة (pure) لا تحتاج state — وجودها داخل الـ component يجعلها تُعاد إنشاؤها في كل render (حتى لو الـ reference ثابت لأنها function declarations).

---

## ملخص الحسابات المتوقعة

| الوضع | Renders عند تغيير exportMode |
|-------|------------------------------|
| الحالي (بدون إصلاح) | 600 صف/كرت × 4-8 date ops = ~3200+ عملية |
| بعد الإصلاح | 0 صف (كلها memo skip) + props comparison رخيصة |

---

## خلاصة: لا تعقيدات مفتوحة

- لا NEEDS CLARIFICATION
- لا مكتبات جديدة
- لا تغيير في واجهة المستخدم
- لا تغيير في منطق التصدير
- لا تغيير في قاعدة البيانات
