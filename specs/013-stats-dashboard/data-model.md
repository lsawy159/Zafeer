# Data Model: لوحة الإحصائيات

**No new DB tables.** All data sourced from existing `companies` + `employees` tables.

---

## Input Row Types (for statsCalculator.ts)

### StatsCompanyRow
```typescript
{
  id: string
  commercial_registration_expiry: string | null
  ending_subscription_power_date: string | null
  ending_subscription_moqeem_date: string | null
}
```
Subset of `Company` type. Only the 3 tracked dates needed.

### StatsEmployeeRow
```typescript
{
  id: string
  // Date fields (for expiry + classification)
  residence_expiry: string | null
  contract_expiry: string | null
  hired_worker_contract_expiry: string | null
  health_insurance_expiry: string | null
  // Missing data fields (Section D)
  salary: number | null                 // 0 counts as missing
  profession: string | null
  bank_account: string | null
  residence_image_url: string | null
  company_unified_number: string | null // رقم الموحد للمؤسسة التابع لها
  // Soft-delete
  is_deleted: boolean | null
}
```
Subset of `Employee` type. `is_deleted` must be present for defensive exclusion. `passport_number` excluded from scope.

---

## Output Types (statsTypes.ts)

### CompanyClassification
```typescript
'healthy' | 'damaged' | 'missing'
```

### CompanyStatsResult (Section A)
```typescript
{
  healthy: number    // سليمة
  damaged: number    // متضررة
  missing: number    // ناقصة
  total: number
}
```

### EmployeeStatsResult (Section A')
```typescript
{
  healthy: number    // سليم — كل التواريخ الأربعة موجودة وغير منتهية
  damaged: number    // متضرر — تاريخ واحد على الأقل منتهٍ (وكلها موجودة)
  missing: number    // ناقص — تاريخ واحد على الأقل null/فارغ
  total: number
}
```
Employee classification uses dates only: `residence_expiry`, `contract_expiry`, `hired_worker_contract_expiry`, `health_insurance_expiry`.

### AlertLevel
```typescript
'urgent' | 'high' | 'medium'
// urgent = طارئ, high = عاجل, medium = متوسط
```

### CompanyAlertStatsResult (Section B)
```typescript
{
  urgent: number    // طارئ — companies expiring within urgent threshold
  high: number      // عاجل
  medium: number    // متوسط
}
// Only "currently healthy" companies are counted here
```

### EmployeeExpiredDocsResult (Section C)
```typescript
{
  residence: number
  contract: number
  hired_worker_contract: number
  health_insurance: number
}
```

### EmployeeMissingDocsResult (Section D)
```typescript
{
  // Date fields
  residence: number
  contract: number
  hired_worker_contract: number
  health_insurance: number
  // Administrative
  salary: number                // null OR === 0
  profession: number
  // Documents
  bank_account: number
  residence_image: number
  // Company link
  company_unified_number: number
}
// passport excluded from scope
```

### EmployeeAlertStatsResult (Section E)
```typescript
{
  urgent: number    // طارئ — any doc expiring within its urgent threshold
  high: number      // عاجل
  medium: number    // متوسط
}
// Only employees with no expired docs — future-expiring only
```

### StatsThresholds (bundle passed to calculator)
```typescript
{
  company: typeof DEFAULT_STATUS_THRESHOLDS    // from autoCompanyStatus.ts
  employee: EmployeeNotificationThresholds      // from employeeAlerts.ts
}
```

### AllStatsResult (top-level returned by StatsDashboard useMemo)
```typescript
{
  companyStats: CompanyStatsResult           // Section A
  companyAlerts: CompanyAlertStatsResult     // Section B
  employeeStats: EmployeeStatsResult         // Section A'
  employeeExpired: EmployeeExpiredDocsResult // Section C
  employeeMissing: EmployeeMissingDocsResult // Section D
  employeeAlerts: EmployeeAlertStatsResult   // Section E
}
```

### StatsDetailModalProps
```typescript
{
  title: string
  type: 'company' | 'employee'
  entities: StatsCompanyRow[] | StatsEmployeeRow[]
  onClose: () => void
}
```
Modal opened by StatsDashboard when card is clicked. Filters applied lazily using predicates at click time.

---

## Predicate Functions (from statsCalculator.ts)
```typescript
export const predicates = {
  isHealthyCompany:  (row: StatsCompanyRow,  today: Date) => boolean,
  isDamagedCompany:  (row: StatsCompanyRow,  today: Date) => boolean,
  isMissingCompany:  (row: StatsCompanyRow,  today: Date) => boolean,
  isHealthyEmployee: (row: StatsEmployeeRow, today: Date) => boolean,
  isDamagedEmployee: (row: StatsEmployeeRow, today: Date) => boolean,
  isMissingEmployee: (row: StatsEmployeeRow, today: Date) => boolean,
  hasExpiredResidence: (row: StatsEmployeeRow, today: Date) => boolean,
  // ...etc for all section C/D filters
}
```
Used by StatsDetailModal at click time: `entities.filter(r => predicates.isDamagedCompany(r, today))`.

---

## Company Classification Logic (3-date rule)

```
classifyCompany(company, today):
  const dates = [
    commercial_registration_expiry,
    ending_subscription_power_date,
    ending_subscription_moqeem_date
  ]

  if (any date is null/empty/undefined) → 'missing'
  else if (any date where today > expiry)  → 'damaged'
  else                                      → 'healthy'

Priority: missing > damaged > healthy
```

## Employee Classification Logic (4-date rule)
```
classifyEmployee(employee, today):
  const dates = [
    residence_expiry,
    contract_expiry,
    hired_worker_contract_expiry,
    health_insurance_expiry
  ]

  if (any date is null/empty/undefined) → 'missing'
  else if (any date where today > expiry)  → 'damaged'
  else                                      → 'healthy'

Priority: missing > damaged > healthy
```
Uses date fields ONLY for classification. Missing administrative data (salary, profession, etc.) → Section D cards, not Section A'.

## Employee "Expired" Definition
```
isDocExpired(dateStr, today):
  if (!dateStr) → false (missing, not expired)
  return today > new Date(dateStr)  // strict greater than
```

## Employee "Alert" Logic
```
getDocAlertLevel(dateStr, thresholdUrgent, thresholdHigh, thresholdMedium, today):
  if (!dateStr) → null (missing, not an alert)
  days = floor((new Date(dateStr) - today) / 86_400_000)
  if (days <= 0)              → null (expired, not an alert)
  if (days <= thresholdUrgent) → 'urgent'
  if (days <= thresholdHigh)   → 'high'
  if (days <= thresholdMedium) → 'medium'
  else                         → null
```

---

## No Changes to Companies.tsx or useEmployeeFilters.ts

With the modal approach (D10), navigation to other pages is eliminated. No new state in Companies.tsx; no new filter values in useEmployeeFilters.ts.

The modal `StatsDetailModal` receives pre-filtered entities from `StatsDashboard` using `predicates` from `statsCalculator.ts`.
