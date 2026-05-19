# Quickstart: تطوير لوحة الإحصائيات

## المسار السريع

```bash
# تشغيل التطبيق
cd artifacts/zafeer
pnpm dev

# بعد التطوير — تحقق من الأنواع
pnpm typecheck
```

## ترتيب التطوير

```
1. types/statsTypes.ts        ← أول شيء، zero deps
2. utils/statsCalculator.ts   ← pure functions فقط
3. components/stats/StatCard.tsx
4. hooks/useEmployeeFilters.ts  ← أضف 'ناقص' + missing-* shortcuts
5. pages/Companies.tsx          ← أضف classificationFilter + URL handler
6. components/stats/StatsDashboard.tsx
7. pages/Reports.tsx            ← tab integration
8. components/layout/nav-config.ts ← rename label
```

## الملفات الحرجة للقراءة قبل البدء

| الملف | لماذا |
|---|---|
| `src/utils/autoCompanyStatus.ts` | DEFAULT_STATUS_THRESHOLDS + getStatusThresholds() |
| `src/utils/employeeAlerts.ts` | DEFAULT_EMPLOYEE_THRESHOLDS + getEmployeeNotificationThresholdsPublic() |
| `src/pages/employees/employeeUtils.ts` | getStatusForField() — يجب أن يتطابق مع حساب statsCalculator |
| `src/hooks/useEmployees.ts` | useAllEmployeesPage() signature + return type |
| `src/hooks/useCompanies.ts` | useAllCompanies() signature + return type |

## أماكن التغيير الدقيقة

### Reports.tsx
- سطر 38: `type TabType = 'companies' | 'employees'` ← أضف `| 'stats'`
- سطر 409: `if (loading)` ← يصبح `if (loading && activeTab !== 'stats')`
- سطر 431: `title="التقارير"` ← `title="التقارير والإحصائيات"`
- سطر ~463: أضف tab button ثالث "الإحصائيات"
- سطر 264: effect `setFilterType('all')` ← guard بـ `if (activeTab === 'stats') return`
- سطر 134: `updateTabStatistics` useCallback ← guard بـ `if (tab === 'stats') return`
- داخل return: اعرض `<StatsDashboard />` عند `activeTab === 'stats'`

### nav-config.ts
- سطر 106: `labelAr: 'التقارير'` → `'التقارير والإحصائيات'`

### useEmployeeFilters.ts
- في `filteredEmployees` useMemo: لكل `matchesX` — أضف حالة `filter === 'ناقص' ? status === 'غير محدد' : status === filter`
- في `applyUrlFilter` switch: أضف `case 'missing-residence'`, `'missing-contract'`, `'missing-hired-worker-contract'`, `'missing-insurance'`, `'expired-hired-worker-contract'`

### Companies.tsx
- أضف `classificationFilter` state
- في `filteredCompanies useMemo`: أضف بند للتصنيف
- في URL `useEffect` (سطر 517): أضف `case 'damaged'`, `'missing'`, `'healthy'` ← تعديل `setClassificationFilter`
- في `clearFilters`: أضف `setClassificationFilter('all')`
- **لا تضيف** `classificationFilter` في `saveFiltersToStorage` أو `loadSavedFilters`

## اختبار سريع للتحقق من الصحة

1. افتح صفحة التقارير → تبويب الإحصائيات ← يظهر بدون crash
2. عدد "المؤسسات السليمة" + "المتضررة" + "الناقصة" = إجمالي المؤسسات
3. اضغط بطاقة "المتضررة" → تنتقل لصفحة المؤسسات مع فلتر نشط
4. عدد المؤسسات في الصفحة = عدد البطاقة
5. عدّل عتبة تنبيه في الإعدادات → عنوان البطاقة يتغير عند إعادة فتح التبويب
6. صفحة الموظفين: اضغط "إقامات ناقصة" → موظفون بدون `residence_expiry`

## نقاط الخطر

- **لا تنسَ guard** `if (activeTab === 'stats')` في `updateTabStatistics` و`setFilterType`
- **classificationFilter** يجب ألا يُحفظ في localStorage
- **دالة `daysBetween`** في `statsCalculator.ts` يجب أن تستخدم floor (لا ceil) لتطابق `differenceInDays`
- **`today`** في `StatsDashboard` → `useMemo(() => new Date(), [])` ← ثابت per mount
