# Quickstart: إصلاح تهنيج تصدير الموظفين

**Branch**: `011-fix-export-performance`

---

## الملف الوحيد المتأثر

```
artifacts/zafeer/src/components/import-export/ExportTab.tsx
```

---

## خطوات التطوير

```bash
# 1. تأكد من الـ branch الصحيح
git checkout 011-fix-export-performance

# 2. شغّل الـ dev server
cd artifacts/zafeer
pnpm dev

# 3. بعد التعديل — تأكد من عدم وجود TypeScript errors
pnpm typecheck
```

---

## التغييرات المطلوبة (بالترتيب)

### 1. تعديل الـ import
```typescript
// قبل:
import { useState, useEffect, useMemo, ReactNode } from 'react'
// بعد:
import { useState, useEffect, useMemo, useCallback, memo, ReactNode } from 'react'
```

### 2. نقل helpers قبل ExportTab مباشرة (module-level)

نقل هذه الدوال والثوابت من داخل `ExportTab` إلى خارجها (فوقها):
- `STATUS_THRESHOLDS` (const)
- `isExpired()`
- `isExpiringWithin30Days()`
- `getDaysRemaining()`
- `getDateTextColor()`
- `formatDateStatus()`

### 3. إضافة Type + Compute Function (قبل ExportTab)

```typescript
type EmployeeWithRelations = Employee & { company: Company; project?: Project }

interface EmployeeDisplayData {
  contractDays: number | null
  hiredDays: number | null
  residenceDays: number | null
  insuranceDays: number | null
  contractFormatted: string
  hiredFormatted: string
  residenceFormatted: string
  insuranceFormatted: string
}

function computeEmployeeDisplayData(emp: EmployeeWithRelations, today: Date): EmployeeDisplayData {
  return {
    contractDays: emp.contract_expiry ? differenceInDays(new Date(emp.contract_expiry), today) : null,
    hiredDays: emp.hired_worker_contract_expiry ? differenceInDays(new Date(emp.hired_worker_contract_expiry), today) : null,
    residenceDays: emp.residence_expiry ? differenceInDays(new Date(emp.residence_expiry), today) : null,
    insuranceDays: emp.health_insurance_expiry ? differenceInDays(new Date(emp.health_insurance_expiry), today) : null,
    contractFormatted: emp.contract_expiry ? formatDateShortWithHijri(emp.contract_expiry) : '',
    hiredFormatted: emp.hired_worker_contract_expiry ? formatDateShortWithHijri(emp.hired_worker_contract_expiry) : '',
    residenceFormatted: emp.residence_expiry ? formatDateShortWithHijri(emp.residence_expiry) : '',
    insuranceFormatted: emp.health_insurance_expiry ? formatDateShortWithHijri(emp.health_insurance_expiry) : '',
  }
}
```

### 4. إضافة EmployeeTableRow (قبل ExportTab)

```typescript
const EmployeeTableRow = memo(function EmployeeTableRow({
  emp, displayData, isSelected, onToggle,
}: {
  emp: EmployeeWithRelations
  displayData: EmployeeDisplayData
  isSelected: boolean
  onToggle: (id: string) => void
}) {
  return (
    <tr className="hover:bg-neutral-50 cursor-pointer" onClick={() => onToggle(emp.id)}>
      {/* ... نفس محتوى الـ <tr> الحالي لكن باستخدام displayData بدلاً من IIFEs ... */}
    </tr>
  )
})
```

### 5. إضافة EmployeeCardItem (قبل ExportTab)

```typescript
const EmployeeCardItem = memo(function EmployeeCardItem({
  emp, displayData, isSelected, onToggle,
}: {
  emp: EmployeeWithRelations
  displayData: EmployeeDisplayData
  isSelected: boolean
  onToggle: (id: string) => void
}) {
  return (
    <div onClick={() => onToggle(emp.id)} className={/* ... */}>
      {/* ... نفس محتوى الكرت الحالي لكن باستخدام displayData ... */}
    </div>
  )
})
```

### 6. إضافة داخل ExportTab

```typescript
// بعد useState declarations:
const today = useMemo(() => new Date(), [])

const employeeDisplayData = useMemo(() =>
  new Map(filteredEmployees.map(emp => [emp.id, computeEmployeeDisplayData(emp, today)])),
  [filteredEmployees, today]
)

const handleToggleEmployee = useCallback((id: string) => {
  setSelectedEmployees(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
}, [])
```

### 7. استبدال rendering في الجدول

```typescript
// بدلاً من:
{filteredEmployees.map((emp) => (
  <tr key={emp.id} onClick={() => toggleEmployeeSelection(emp.id)} ...>
    {/* IIFE date computations */}
  </tr>
))}

// استخدم:
{filteredEmployees.map((emp) => (
  <EmployeeTableRow
    key={emp.id}
    emp={emp}
    displayData={employeeDisplayData.get(emp.id)!}
    isSelected={selectedEmployees.has(emp.id)}
    onToggle={handleToggleEmployee}
  />
))}
```

### 8. استبدال rendering في الكروت

```typescript
// نفس النمط:
{filteredEmployees.map((emp) => (
  <EmployeeCardItem
    key={emp.id}
    emp={emp}
    displayData={employeeDisplayData.get(emp.id)!}
    isSelected={selectedEmployees.has(emp.id)}
    onToggle={handleToggleEmployee}
  />
))}
```

---

## التحقق من النجاح

1. افتح تبويب الاستيراد/التصدير → تصدير موظفين
2. غيّر نوع التصدير من "أساسي" إلى "شهري" → **يجب ألا يكون هناك تجمد**
3. حدد موظفاً → تظل التحديدات محفوظة
4. جرّب التصدير الفعلي → يجب أن ينجح بنفس البيانات
5. `pnpm typecheck` → صفر أخطاء
