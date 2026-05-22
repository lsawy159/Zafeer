# Research: إزالة تبويب إعدادات التقارير

**Date**: 2026-05-21

## Findings

### 1. نطاق الحذف

**Decision**: الحذف محصور في `settingsConfig.ts` فقط — لا ملفات أخرى.

**Rationale**: بحث `grep` في كل `src/` أثبت أن `REPORTS_SETTINGS` و`'reports'` كـ tab key موجودان فقط في `settingsConfig.ts`. باقي إشارات `reports` في المشروع (nav-config، permissions، App.tsx، Reports.tsx) تخص صفحة `/reports` المستقلة وليس تبويب الإعدادات.

**Alternatives considered**: تعديل `GeneralSettings.tsx` أيضاً — مرفوض لأن الصفحة تعمل dynamic على `settingsCategories` array.

---

### 2. URL Safety

**Decision**: لا يلزم redirect أو error handling إضافي لـ `?tab=reports`.

**Rationale**: `GeneralSettings.tsx:129` يحتوي فعلاً على:
```typescript
if (ALLOWED_TABS.includes(tab as TabType)) {
  setActiveTab(tab as TabType)
}
```
بعد حذف `'reports'` من `ALLOWED_TABS`، هذا الشرط يفشل بصمت و`activeTab` يبقى `'system'`. لا crash.

---

### 3. TypeScript Safety

**Decision**: حذف `FileText` من lucide-react imports ضروري لتجنب unused import warning.

**Rationale**: `FileText` icon مستخدم حصراً في entry الـ reports داخل `buildSettingsCategories`. بعد حذف الـ entry يصبح unused.

**Verification**: `pnpm run typecheck` يجب أن يمر بـ 0 errors بعد الحذف.

---

### 4. Database

**Decision**: لا migration، لا حذف من DB.

**Rationale**: البيانات المحفوظة مسبقاً (`report_*` keys في `system_settings`) تُترك كما هي. لا كود يقرأها ولا ضرر من بقائها.
