# Research: لوحة الإحصائيات

**Phase 0 — All NEEDS CLARIFICATION resolved from codebase scan**

---

## R-001 — أسماء حقول التواريخ الفعلية

**Decision**: الأسماء المؤكدة من `lib/supabase.ts`

| الحقل في المتطلبات | الاسم الفعلي في DB |
|---|---|
| date1 (مؤسسة) | `commercial_registration_expiry` |
| date2 (مؤسسة) | `ending_subscription_power_date` |
| date3 (مؤسسة) | `ending_subscription_moqeem_date` |
| residency_expiry (موظف) | `residence_expiry` |
| ajeer_contract_expiry | `hired_worker_contract_expiry` |
| work_contract_expiry | `contract_expiry` |
| health_insurance_expiry | `health_insurance_expiry` ✅ |
| commercial_record_expiry | **غير موجود** — محذوف من النطاق |
| qiwa_subscription_expiry | **غير موجود** — محذوف من النطاق |
| muqeem_subscription_expiry | **غير موجود** — محذوف من النطاق |

**Rationale**: حقول `qiwa`/`muqeem`/`commercial_record` مذكورة في المتطلبات الأصلية لكنها غير موجودة في نموذج بيانات الموظف — تم حذفها من النطاق.

---

## R-002 — نظام إدارة الحالة (State Management)

**Decision**: React Query (TanStack) للبيانات من DB + React `useState` للحالة المحلية.

**Evidence**:
- `useEmployees.ts` → `useQuery`, `useMutation`, `useQueryClient`
- `useCompanies.ts` → نفس النمط
- Cache config: `staleTime: 60s`, `gcTime: 10m` للموظفين، مختلفة للمؤسسات

**Hooks المتاحة**:
- `useAllCompanies()` في `src/hooks/useCompanies.ts`
- `useAllEmployeesPage()` في `src/hooks/useEmployees.ts` — يفلتر `is_deleted=false` تلقائياً

---

## R-003 — عتبات التنبيهات (Alert Thresholds)

**Decision**: عتباتان منفصلتان — للمؤسسات وللموظفين.

### عتبات المؤسسات
**Source**: `src/utils/autoCompanyStatus.ts` — `getStatusThresholds()` من `system_settings.status_thresholds`

```typescript
DEFAULT_STATUS_THRESHOLDS = {
  commercial_reg_urgent_days: 7,    // طارئ
  commercial_reg_high_days: 15,     // عاجل
  commercial_reg_medium_days: 30,   // متوسط
  power_subscription_urgent_days: 7,
  power_subscription_high_days: 15,
  power_subscription_medium_days: 30,
  moqeem_subscription_urgent_days: 7,
  moqeem_subscription_high_days: 15,
  moqeem_subscription_medium_days: 30,
}
```

### عتبات الموظفين
**Source**: `src/utils/employeeAlerts.ts` — `getEmployeeNotificationThresholdsPublic()` من `system_settings.notification_thresholds`

```typescript
DEFAULT_EMPLOYEE_THRESHOLDS = {
  residence_urgent_days: 7, residence_high_days: 15, residence_medium_days: 30,
  contract_urgent_days: 7, contract_high_days: 15, contract_medium_days: 30,
  health_insurance_urgent_days: 30, health_insurance_high_days: 45, health_insurance_medium_days: 60,
  hired_worker_contract_urgent_days: 7, hired_worker_contract_high_days: 15, hired_worker_contract_medium_days: 30,
}
```

**Cache**: 5 دقائق لكلٍّ منهما. Fallback للقيم الافتراضية عند غياب صف في DB.

---

## R-004 — آلية فلتر المؤسسات

**Decision**: `useState` + `localStorage` + URL params محدودة.

**Key file**: `src/pages/Companies.tsx`

**الحالة الحالية**:
- فلاتر محفوظة في `localStorage` تحت مفتاح `'companiesFilters'`
- تُحمَّل عند mount عبر `loadSavedFilters()`
- URL handler حالي يدعم `?filter=alerts` فقط → `setShowAlertsOnly(true)`
- لا يوجد `classificationFilter` (سليمة/متضررة/ناقصة)

**ما يحتاج إضافته**:
- `classificationFilter: 'all' | 'healthy' | 'damaged' | 'missing'`
- معالجة URL لـ `?filter=damaged`, `?filter=missing`, `?filter=healthy`
- بند في `filteredCompanies useMemo` يطبق التصنيف الثلاثي
- **هام**: `classificationFilter` لا يُحفظ في `localStorage` (حتى لا يتغلب على URL)

---

## R-005 — آلية فلتر الموظفين

**Decision**: `useEmployeeFilters` hook + `applyUrlFilter()` بـ URL shortcuts.

**Key file**: `src/hooks/useEmployeeFilters.ts`

**Shortcuts الموجودة**:
```
'alerts' → كل الحقول = 'لديه تنبيه'
'expired-contracts' → contractFilter = 'منتهي'
'expired-residences' → residenceFilter = 'منتهي'
'expired-insurance' → healthInsuranceFilter = 'منتهي'
'urgent-contracts' → contractFilter = 'طارئ'
'urgent-residences' → residenceFilter = 'طارئ'
'expiring-insurance-30' → healthInsuranceFilter = 'طارئ'
'expiring-insurance-60' → healthInsuranceFilter = 'متوسط'
```

**Shortcuts المطلوب إضافتها**:
```
'missing-residence' → residenceFilter = 'ناقص'
'missing-contract' → contractFilter = 'ناقص'
'missing-hired-worker-contract' → hiredWorkerContractFilter = 'ناقص'
'missing-insurance' → healthInsuranceFilter = 'ناقص'
'expired-hired-worker-contract' → hiredWorkerContractFilter = 'منتهي'
```

**التعديل المطلوب على المطابقة**:
دوال `matchesContract`/`matchesResidence`/etc. تضيف: إذا كانت قيمة الفلتر `'ناقص'` تتطابق عندما `status === 'غير محدد'` (ما تُرجعه `getStatusForField` عند null).

---

## R-006 — صفحة التقارير الحالية

**Evidence**: `src/pages/Reports.tsx`

**ما يهمنا**:
- `TabType = 'companies' | 'employees'` → يصبح `'companies' | 'employees' | 'stats'`
- `useState<TabType>('companies')` — يبدأ بالمؤسسات
- Loading gate سطر 409: `if (loading) return <spinner>` — يحجب كل التبويبات
  → **Fix**: `if (loading && activeTab !== 'stats') return <spinner>`
- `updateTabStatistics` و`setFilterType` يفترضان `'companies'|'employees'` فقط
  → إضافة guard: `if (activeTab === 'stats') return`
- Title في `<PageHeader>`: `"التقارير"` → `"التقارير والإحصائيات"`
- Tab button جديد: أيقونة `BarChart3` (مستورد بالفعل) أو `PieChart`

---

## R-007 — بنية المكوّن الجديد

**Decision**: `StatsDashboard` يُعرض فقط عند `activeTab === 'stats'`.

**Data flow**:
1. `useAllCompanies()` → بيانات المؤسسات (React Query cache)
2. `useAllEmployeesPage()` → بيانات الموظفين بدون محذوفين (React Query cache)
3. `useEffect` → `getStatusThresholds()` + `getEmployeeNotificationThresholdsPublic()` async → state
4. `useMemo(today)` → تاريخ ثابت per mount
5. `useMemo([companies, employees, thresholds, today])` → يستدعي `statsCalculator.ts`
6. `useNavigate()` → card onClick

---

## R-008 — يوم الحساب (Day Math Convention)

**Decision**: `Math.floor((expiry.getTime() - today.getTime()) / 86_400_000)`

**Rationale**: يطابق `differenceInDays` من `date-fns` (floor convention) المستخدم في `Reports.tsx` و`employeeUtils.ts`. يضمن تطابق عدد البطاقة مع الأعداد المعروضة في الصفحات الأخرى.

**Strict positive for alerts**: `daysRemaining > 0 && daysRemaining <= threshold` — يستبعد اليوم صفر والمنتهية.

---

## R-009 — الحقول الإحصائية الإضافية (من مسح الكود)

لا توجد حقول تاريخ إضافية ذات قيمة إحصائية غير المدرجة. الحقول الأخرى (`birth_date`, `joining_date`) ليست "وثائق تنتهي" بل بيانات إدارية. حقول boolean مثل `bank_account`, `passport_number`, `residence_image_url` لها قيمة إحصائية ثانوية — تُضاف لقسم D كبطاقات "بيانات ناقصة" إضافية اختيارية.

**إضافة محتملة لقسم D**:
- موظفون بلا جواز سفر (`passport_number` فارغ)
- موظفون بلا حساب بنكي (`bank_account` فارغ)
- موظفون بلا صورة إقامة (`residence_image_url` فارغ)

**Decision**: تُضاف هذه كبطاقات منفصلة في نهاية قسم D مع label مناسب. لا تدعم navigation بفلتر (لا يوجد آلية فلتر موجودة لهذه الحقول).
