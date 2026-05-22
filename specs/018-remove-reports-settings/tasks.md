# Tasks: إزالة تبويب إعدادات التقارير

**Input**: Design documents from `/specs/018-remove-reports-settings/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅

**Note**: كل التغييرات في ملف واحد (`settingsConfig.ts`) — التسلسل إلزامي.

---

## Phase 1: Foundational — قراءة وتحليل الملف

**Purpose**: التأكد من النطاق الكامل قبل الحذف

- [x] T001 اقرأ `artifacts/zafeer/src/pages/settings/settingsConfig.ts` بالكامل وتحقق من السطور المحددة في plan.md (TabType:28، ALLOWED_TABS:39، REPORTS_SETTINGS:55-92، buildSettingsCategories:194-199، FileText import)

**Checkpoint**: النطاق محدد — جاهز للحذف

---

## Phase 2: User Story 1+2 — إزالة التبويب (Priority: P1)

**Goal**: حذف كل أثر لـ `reports` من `settingsConfig.ts` دون كسر أي شيء آخر

**Independent Test**: فتح صفحة إعدادات النظام — لا يظهر "إعدادات التقارير" في الـ sidebar، وجميع التبويبات الـ8 الأخرى تعمل.

### Implementation

- [x] T002 [US1] احذف `| 'reports'` من `TabType` union في `artifacts/zafeer/src/pages/settings/settingsConfig.ts` (سطر ~28)
- [x] T003 [US1] احذف `'reports',` من مصفوفة `ALLOWED_TABS` في `artifacts/zafeer/src/pages/settings/settingsConfig.ts` (سطر ~39)
- [x] T004 [US1] احذف `REPORTS_SETTINGS` const كاملاً (السطور 55-92) من `artifacts/zafeer/src/pages/settings/settingsConfig.ts`
- [x] T005 [US1] احذف entry الـ reports كاملاً من `buildSettingsCategories` في `artifacts/zafeer/src/pages/settings/settingsConfig.ts` (السطور ~194-199، تشمل key/label/description/icon/settings)
- [x] T006 [US1] احذف `FileText` من import الـ lucide-react في `artifacts/zafeer/src/pages/settings/settingsConfig.ts` (أصبح unused بعد T005)

**Checkpoint**: تبويب "إعدادات التقارير" محذوف من `settingsConfig.ts` — `buildSettingsCategories` يرجع 8 فئات بدلاً من 9

---

## Phase 3: Polish — التحقق

**Purpose**: التأكد من سلامة TypeScript وعدم وجود أي أثر متبقي

- [x] T007 شغّل `pnpm run typecheck` من جذر المشروع وتأكد من مرور الـ check بـ 0 errors
- [x] T008 [P] شغّل `grep -r "REPORTS_SETTINGS" artifacts/zafeer/src/` وتأكد من 0 نتائج
- [x] T009 [P] شغّل `grep -rn "| 'reports'\|'reports'," artifacts/zafeer/src/pages/settings/` وتأكد من 0 نتائج
- [ ] T010 افتح `/settings` في المتصفح وتحقق يدوياً: (1) لا يظهر "إعدادات التقارير" في الـ sidebar، (2) عدد التبويبات = 8، (3) لا أخطاء في الـ console (يغطي SC-001، SC-003، FR-006)
- [ ] T011 افتح `/settings?tab=reports` مباشرة في المتصفح وتحقق: الصفحة تعرض تبويب `system` بصمت بدون خطأ أو redirect نشط (يغطي FR-004)

---

## Dependencies & Execution Order

- **Phase 1**: تبدأ فوراً — لا dependencies
- **Phase 2**: بعد Phase 1 — T002→T003→T004→T005→T006 (نفس الملف — sequential)
- **Phase 3**: بعد Phase 2 — T007 أولاً، ثم T008+T009 معاً [P]، ثم T010+T011 يدوياً في المتصفح

---

## Implementation Strategy

### MVP (الفيتشر كله = MVP)

1. T001 — قرأ الملف
2. T002-T006 — الحذفات الـ5
3. T007-T009 — التحقق
4. **Done** — لا phases إضافية

---

## Notes

- [P] = يمكن تشغيلهم معاً (ملفات مختلفة أو لا dependencies بينهم)
- [US1] = ينتمي لـ User Stories 1+2 معاً (نفس التغيير يخدمهم)
- لا DB migrations، لا component جديد، لا import جديد في `GeneralSettings.tsx`
- `?tab=reports` آمن تلقائياً بعد الحذف — راجع research.md
