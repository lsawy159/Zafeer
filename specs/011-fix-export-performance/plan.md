# Implementation Plan: إصلاح تهنيج تصدير الموظفين

**Branch**: `011-fix-export-performance` | **Date**: 2026-05-18 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/011-fix-export-performance/spec.md`

---

## Summary

تبويب تصدير الموظفين يتجمد 2+ ثانية عند التبديل بين "تصدير أساسي" و"تصدير شهري بالتفاصيل المالية".
السبب: `ExportTab.tsx` (2028 سطر) يُعيد رسم كل قائمة الموظفين (desktop جدول + mobile كروت = double rendering) مع حسابات تاريخ مكلفة على كل state change، رغم أن نوع التصدير لا يؤثر على عرض القائمة إطلاقاً.

الحل: `React.memo` + `useMemo` بدون مكتبات جديدة، بدون تغيير وظيفي، ملف واحد فقط.

---

## Technical Context

**Language/Version**: TypeScript 5.9 / React 19.1  
**Primary Dependencies**: React (`memo`, `useMemo`, `useCallback`) — موجودة بالفعل  
**Storage**: N/A — لا تغييرات DB  
**Testing**: Vitest (unit) + Manual browser test  
**Target Platform**: Web browser (SPA — Vite 7.3)  
**Project Type**: Web application (frontend component optimization)  
**Performance Goals**: <200ms عند تغيير نوع التصدير مع 100+ موظف  
**Constraints**: لا تغييرات وظيفية، لا dependencies جديدة، ملف واحد  
**Scale/Scope**: 100-500 موظف في القائمة

---

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Supabase-First | ✅ Pass | لا تغييرات DB أو data fetching |
| II. Arabic UX RTL | ✅ Pass | لا تغييرات UI مرئية |
| III. Type Safety | ✅ Pass | إضافة types جديدة محددة (`EmployeeDisplayData`) |
| IV. Security RLS | ✅ Pass | لا تغييرات auth أو permissions |
| V. Monorepo Discipline | ✅ Pass | تغيير في `artifacts/zafeer/src/` فقط |
| VI. Brand Identity ZaFeer | ✅ Pass | لا تغييرات naming |
| VII. Users vs Employees | ✅ Pass | لا تغييرات architecture — employees لا تزال data records فقط |

**Gate Result: PASS — يمكن المتابعة للتنفيذ**

---

## Project Structure

### Documentation (this feature)

```text
specs/011-fix-export-performance/
├── plan.md              ← هذا الملف
├── research.md          ← تحليل الأسباب والقرارات
├── data-model.md        ← EmployeeDisplayData type
├── quickstart.md        ← دليل التطوير
├── checklists/
│   └── requirements.md
└── tasks.md             ← يُنشأ بـ /speckit-tasks
```

### Source Code (ملف واحد فقط)

```text
artifacts/zafeer/src/
└── components/
    └── import-export/
        └── ExportTab.tsx   ← الملف الوحيد المتأثر
```

---

## Implementation Design

### التغييرات بالترتيب

#### الخطوة 1: تعديل imports

```typescript
// أضف useCallback و memo
import { useState, useEffect, useMemo, useCallback, memo, ReactNode } from 'react'
```

#### الخطوة 2: نقل helpers إلى module-level

نقل من داخل ExportTab إلى خارجها (قبلها مباشرة):
- `const STATUS_THRESHOLDS = { urgent: 7, high: 15, medium: 30 }`
- `function isExpired(...)`
- `function isExpiringWithin30Days(...)`
- `function getDaysRemaining(...)`
- `function getDateTextColor(...)`
- `function formatDateStatus(...)`

> **لماذا:** دوال بحتة لا تعتمد على state → وجودها داخل الـ component ليس له مبرر.

#### الخطوة 3: إضافة type + function قبل ExportTab

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
    contractDays: emp.contract_expiry
      ? differenceInDays(new Date(emp.contract_expiry), today)
      : null,
    hiredDays: emp.hired_worker_contract_expiry
      ? differenceInDays(new Date(emp.hired_worker_contract_expiry), today)
      : null,
    residenceDays: emp.residence_expiry
      ? differenceInDays(new Date(emp.residence_expiry), today)
      : null,
    insuranceDays: emp.health_insurance_expiry
      ? differenceInDays(new Date(emp.health_insurance_expiry), today)
      : null,
    contractFormatted: emp.contract_expiry
      ? formatDateShortWithHijri(emp.contract_expiry)
      : '',
    hiredFormatted: emp.hired_worker_contract_expiry
      ? formatDateShortWithHijri(emp.hired_worker_contract_expiry)
      : '',
    residenceFormatted: emp.residence_expiry
      ? formatDateShortWithHijri(emp.residence_expiry)
      : '',
    insuranceFormatted: emp.health_insurance_expiry
      ? formatDateShortWithHijri(emp.health_insurance_expiry)
      : '',
  }
}
```

#### الخطوة 4: EmployeeTableRow memo component

```typescript
const EmployeeTableRow = memo(function EmployeeTableRow({
  emp,
  displayData,
  isSelected,
  onToggle,
}: {
  emp: EmployeeWithRelations
  displayData: EmployeeDisplayData
  isSelected: boolean
  onToggle: (id: string) => void
}) {
  return (
    <tr
      className="hover:bg-neutral-50 cursor-pointer"
      onClick={() => onToggle(emp.id)}
    >
      <td className="px-3 py-1.5 text-center">
        {isSelected ? (
          <CheckSquare className="w-4 h-4 text-blue-600" />
        ) : (
          <Square className="w-4 h-4 text-neutral-400" />
        )}
      </td>
      <td className="px-3 py-1.5 text-[12px] font-medium text-neutral-900">{emp.name}</td>
      <td className="px-3 py-1.5 text-[12px] text-neutral-700">{emp.profession}</td>
      <td className="px-3 py-1.5 text-[12px] text-neutral-700">{emp.nationality}</td>
      <td className="px-3 py-1.5 text-[12px] text-neutral-700">
        {emp.company?.unified_number
          ? `${emp.company.name} (${emp.company.unified_number})`
          : (emp.company?.name || '')}
      </td>
      <td className="px-3 py-1.5 text-[12px] text-neutral-700">
        {emp.project?.name || emp.project_name || '-'}
      </td>
      <td className="px-3 py-1.5 text-[12px] font-mono text-neutral-900">
        {emp.residence_number || '-'}
      </td>
      <td className="px-3 py-1.5 text-[12px]">
        <div className="flex flex-col gap-0.5 items-start">
          <span className={getDateTextColor(displayData.contractDays)}>
            {displayData.contractFormatted || '-'}
          </span>
          {emp.contract_expiry && (
            <span className="text-[11px] text-neutral-500">
              {formatDateStatus(displayData.contractDays, 'منتهي')}
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-1.5 text-[12px]">
        <div className="flex flex-col gap-0.5 items-start">
          <span className={getDateTextColor(displayData.hiredDays)}>
            {displayData.hiredFormatted || '-'}
          </span>
          {emp.hired_worker_contract_expiry && (
            <span className="text-[11px] text-neutral-500">
              {formatDateStatus(displayData.hiredDays, 'منتهي')}
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-1.5 text-[12px]">
        <div className="flex flex-col gap-0.5 items-start">
          <span className={getDateTextColor(displayData.residenceDays)}>
            {displayData.residenceFormatted || '-'}
          </span>
          {emp.residence_expiry && (
            <span className="text-[11px] text-neutral-500">
              {formatDateStatus(displayData.residenceDays, 'منتهية')}
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-1.5 text-[12px]">
        <div className="flex flex-col gap-0.5 items-start">
          <span className={getDateTextColor(displayData.insuranceDays)}>
            {displayData.insuranceFormatted || '-'}
          </span>
          {emp.health_insurance_expiry && (
            <span className="text-[11px] text-neutral-500">
              {formatDateStatus(displayData.insuranceDays, 'منتهي')}
            </span>
          )}
        </div>
      </td>
    </tr>
  )
})
```

#### الخطوة 5: EmployeeCardItem memo component

```typescript
const EmployeeCardItem = memo(function EmployeeCardItem({
  emp,
  displayData,
  isSelected,
  onToggle,
}: {
  emp: EmployeeWithRelations
  displayData: EmployeeDisplayData
  isSelected: boolean
  onToggle: (id: string) => void
}) {
  return (
    <div
      onClick={() => onToggle(emp.id)}
      className={`bg-white border-2 rounded-lg p-4 cursor-pointer transition-all shadow-sm ${
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : 'border-neutral-200 hover:border-blue-300 hover:shadow'
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3 pb-3 border-b border-neutral-200">
        <div className="pt-0.5">
          {isSelected ? (
            <CheckSquare className="w-5 h-5 text-blue-600" />
          ) : (
            <Square className="w-5 h-5 text-neutral-400" />
          )}
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-neutral-900 text-base leading-tight">{emp.name}</h4>
          <div className="flex flex-wrap gap-2 mt-1">
            <span className="text-xs text-neutral-600">{emp.profession}</span>
            <span className="text-xs text-neutral-400">•</span>
            <span className="text-xs text-neutral-600">{emp.nationality}</span>
          </div>
          <p className="text-xs text-blue-600 mt-1">{emp.company?.name || 'غير محدد'}</p>
          {emp.project?.name && (
            <p className="text-xs text-success-600 mt-0.5">📁 {emp.project.name}</p>
          )}
          {emp.residence_number && (
            <p className="text-xs text-neutral-500 mt-0.5 font-mono">🆔 {emp.residence_number}</p>
          )}
        </div>
      </div>
      {/* Dates Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-neutral-500 flex items-center gap-1">
            <FileText className="w-3 h-3" />العقد
          </p>
          {emp.contract_expiry ? (
            <>
              <p className={`text-xs font-medium ${getDateTextColor(displayData.contractDays)}`}>
                {displayData.contractFormatted}
              </p>
              <p className="text-[10px] text-neutral-500">
                {formatDateStatus(displayData.contractDays, 'منتهي')}
              </p>
            </>
          ) : (
            <p className="text-xs text-neutral-400">غير محدد</p>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-neutral-500 flex items-center gap-1">
            <FileText className="w-3 h-3" />عقد الأجير
          </p>
          {emp.hired_worker_contract_expiry ? (
            <>
              <p className={`text-xs font-medium ${getDateTextColor(displayData.hiredDays)}`}>
                {displayData.hiredFormatted}
              </p>
              <p className="text-[10px] text-neutral-500">
                {formatDateStatus(displayData.hiredDays, 'منتهي')}
              </p>
            </>
          ) : (
            <p className="text-xs text-neutral-400">غير محدد</p>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-neutral-500 flex items-center gap-1">
            <Calendar className="w-3 h-3" />الإقامة
          </p>
          {emp.residence_expiry ? (
            <>
              <p className={`text-xs font-medium ${getDateTextColor(displayData.residenceDays)}`}>
                {displayData.residenceFormatted}
              </p>
              <p className="text-[10px] text-neutral-500">
                {formatDateStatus(displayData.residenceDays, 'منتهية')}
              </p>
            </>
          ) : (
            <p className="text-xs text-neutral-400">غير محدد</p>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-neutral-500 flex items-center gap-1">
            <Shield className="w-3 h-3" />التأمين
          </p>
          {emp.health_insurance_expiry ? (
            <>
              <p className={`text-xs font-medium ${getDateTextColor(displayData.insuranceDays)}`}>
                {displayData.insuranceFormatted}
              </p>
              <p className="text-[10px] text-neutral-500">
                {formatDateStatus(displayData.insuranceDays, 'منتهي')}
              </p>
            </>
          ) : (
            <p className="text-xs text-neutral-400">غير محدد</p>
          )}
        </div>
      </div>
    </div>
  )
})
```

#### الخطوة 6: داخل ExportTab — إضافة useMemo + useCallback

```typescript
// بعد useState declarations، قبل loadData:
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

#### الخطوة 7: استبدال table body rendering

```typescript
// بدلاً من inline <tr> مع IIFEs:
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

#### الخطوة 8: استبدال mobile cards rendering

```typescript
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

#### الخطوة 9: حذف الدوال القديمة من داخل ExportTab

بعد نقلها للخارج، احذف النسخ الداخلية:
- `getDaysRemaining` (سطر 201-205)
- `STATUS_THRESHOLDS` (سطر 207-211)
- `getDateTextColor` (سطر 213-221)
- `formatDateStatus` (سطر 223-228)
- `isExpired` (سطر 189-192)
- `isExpiringWithin30Days` (سطر 194-199)

---

#### الخطوة 10: conditional rendering للـ mobile/desktop (FR-005 — T016)

بدلاً من CSS `hidden lg:block` / `lg:hidden` — يُنفَّذ بعد React.memo fix:

```typescript
// داخل ExportTab — أضف بعد useState declarations:
const [isDesktop, setIsDesktop] = useState(() =>
  typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true
)
useEffect(() => {
  const mq = window.matchMedia('(min-width: 1024px)')
  const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}, [])
```

في الـ JSX — استبدل blocks الـ CSS hidden بـ:
```tsx
{isDesktop
  ? <div className="bg-white rounded-md border ..."> {/* desktop table */} </div>
  : <div className="space-y-3"> {/* mobile cards */} </div>
}
```

النتيجة: ~300 DOM nodes بدلاً من 600 — يحقق FR-005 + SC-005.

---

## Complexity Tracking

لا violations — تحسين أداء بحت بدون أي انحراف عن الـ constitution.

---

## الأثر المتوقع

| Metric | قبل | بعد |
|--------|-----|-----|
| Re-renders عند تغيير exportMode | ~600 صف/كرت × 4-8 ops | 0 (كلها memo skip) |
| حسابات التاريخ | كل render | مرة واحدة عند تغيير filteredEmployees |
| وقت التجميد | 2+ ثانية | <200ms |
| مكتبات جديدة | — | لا شيء |
| تغيير وظيفي | — | لا شيء |
