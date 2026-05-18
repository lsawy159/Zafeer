# Data Model: إصلاح تهنيج تصدير الموظفين

**Branch**: `011-fix-export-performance` | **Date**: 2026-05-18

> لا تغييرات في قاعدة البيانات. هذا الـ spec يُعرِّف فقط نوع بيانات جديد داخل الفرونت.

---

## EmployeeDisplayData (Frontend Type Only)

بيانات العرض المحسوبة مسبقاً لكل موظف في قائمة التصدير.
**يُحسَب مرة واحدة** عند تغيير `filteredEmployees` — لا يُعاد الحساب عند تغيير state آخر.

```typescript
interface EmployeeDisplayData {
  // أيام الفرق — null يعني التاريخ غير محدد
  contractDays:  number | null   // العقد
  hiredDays:     number | null   // عقد أجير
  residenceDays: number | null   // الإقامة
  insuranceDays: number | null   // التأمين الصحي

  // التواريخ منسَّقة جاهزة للعرض (yyyy-MM-dd)
  contractFormatted:  string
  hiredFormatted:     string
  residenceFormatted: string
  insuranceFormatted: string
}
```

**دالة الحساب (module-level):**
```typescript
function computeEmployeeDisplayData(
  emp: EmployeeWithRelations,
  today: Date
): EmployeeDisplayData
```

**التخزين:** `Map<string, EmployeeDisplayData>` حيث المفتاح هو `emp.id`.

---

## EmployeeTableRow Props

```typescript
interface EmployeeTableRowProps {
  emp:         EmployeeWithRelations
  displayData: EmployeeDisplayData
  isSelected:  boolean
  onToggle:    (id: string) => void
}
```

## EmployeeCardItem Props

نفس `EmployeeTableRowProps` — نفس الواجهة.

---

## لا تغييرات DB

- لا migrations
- لا Drizzle schema changes
- لا Supabase RLS changes
- لا Edge Functions
