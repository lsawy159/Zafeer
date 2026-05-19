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
  residence_expiry: string | null
  contract_expiry: string | null
  hired_worker_contract_expiry: string | null
  health_insurance_expiry: string | null
  passport_number: string | null
  bank_account: string | null
  residence_image_url: string | null
  is_deleted: boolean | null
}
```
Subset of `Employee` type. `is_deleted` must be present for defensive exclusion.

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
  residence: number
  contract: number
  hired_worker_contract: number
  health_insurance: number
  passport: number              // اختياري
  bank_account: number          // اختياري
  residence_image: number       // اختياري
}
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
  companyStats: CompanyStatsResult
  companyAlerts: CompanyAlertStatsResult
  employeeExpired: EmployeeExpiredDocsResult
  employeeMissing: EmployeeMissingDocsResult
  employeeAlerts: EmployeeAlertStatsResult
}
```

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

## New State in Companies.tsx

```typescript
type ClassificationFilter = 'all' | 'healthy' | 'damaged' | 'missing'
const [classificationFilter, setClassificationFilter] = useState<ClassificationFilter>('all')
```

**filteredCompanies useMemo** adds:
```
if (classificationFilter !== 'all') {
  filter by classifyCompany(company, today) === classificationFilter
}
```

**NOT persisted** in `localStorage` (URL always wins).

---

## New Filter Values in useEmployeeFilters.ts

The filter state strings for `contractFilter`, `residenceFilter`, etc. gain a new recognized value:

| Value | Meaning | Matching Logic |
|---|---|---|
| `'ناقص'` | Field is null/empty | `getStatusForField(...) === 'غير محدد'` |

Existing values (`'منتهي'`, `'طارئ'`, `'متوسط'`, `'ساري'`, `'لديه تنبيه'`) unchanged.
