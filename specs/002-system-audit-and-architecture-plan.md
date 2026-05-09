# خطة مهندس النظام (Architecture & Quality Plan)

> **النطاق**: نظام Zafeer (HR / منشآت عمل سعودي‑مصري) — `artifacts/sawtracker` + `artifacts/api-server` + `lib/*` + Supabase.
> **التاريخ**: 2026-05-09 — المسؤول: Ahmed (lsawy159) — الفرع: `001-fix-auth-roles-security`
> **الهدف**: نظام متين، آمن، سريع، بدون أخطاء وظيفية، وكل واجهة مربوطة بقاعدة البيانات بشكل دقيق (لا حقل في الـ UI بدون مصدر، ولا عمود في DB بدون استخدام).

---

## 1. ملخص الفحص الشامل

### 1.1 المخزون الحالي
| العنصر | العدد / الحجم | ملاحظة |
|--------|---------------|--------|
| الصفحات (`pages/*.tsx`) | 23 صفحة | منها صفحات اختبارية متروكة (`*TestPage`, `DesignSystem`, `not-found`, `SecurityManagement.tsx` فاضية تقريباً) |
| المكونات (`components/`) | 12 مجلد + UI library كبير (~70 ملف) | تكرار: `DropdownMenu` و `dropdown-menu`، `EmptyState` و `empty-state`، `ErrorMessage` و `error-state` |
| Hooks | 19 hook | Auth/Permissions/UI/Data — جيدة لكن بعضها متضخم |
| الجداول في Supabase | 26 جدول، RLS مفعّل على الكل | لكن السياسات نفسها لم تتم مراجعتها — خطر |
| `lib/db/src/schema/` | فارغ (index.ts فقط) | **خطر**: لا يوجد مصدر حقيقة للـ DB → migrations يدوية فقط |
| `lib/api-spec/openapi.yaml` | يحوي `/healthz` فقط | **خطر**: لا توجد عقود API |
| api-server routes | `users.ts` + `health.ts` | يكفي للـ admin ops |
| اختبارات الواجهة | Vitest على 6 ملفات | تغطية ضعيفة جداً |
| اختبارات الـ API | لا يوجد | صفر تغطية |
| أكبر ملف | `pages/PayrollDeductions.tsx` = **7649 سطر** | عملاق غير قابل للصيانة |
| ثاني أكبر | `pages/Employees.tsx` = 2677 سطر | يحتاج تقسيم |
| ثالث | `pages/AdvancedSearch.tsx` = 2237 سطر | كذلك |

### 1.2 إشارات Supabase Advisor (مختصرة)
- **ERROR** `security_definer_view`: `public.daily_excel_logs_today` — مخاطرة تجاوز RLS.
- **WARN** `function_search_path_mutable` على عدة دوال (`set_updated_at`, `cleanup_old_emails`, …) — استغلال محتمل لتغيير الـ search_path.
- **WARN** `auth_rls_initplan` على `saved_searches` — `auth.uid()` يُعاد تقييمه لكل صف (هبوط أداء).
- **INFO** ~17 FK بدون فهرس covering.
- **INFO** ~16 فهرس غير مستخدم (تكلفة تخزين/كتابة).
- **INFO** `permissions_backup_20260120` بدون PK — جدول مؤقت يجب أرشفته.

---

## 2. الأخطاء/المشاكل المرصودة (مرتبة بالخطورة)

### 🔴 حرج (Blocker)
1. **عدم تطابق Frontend ↔ DB**: الواجهة تتوقع جداول/أعمدة تم إصلاحها بالـ migrations الأخيرة، لكن لا يوجد contract يضمن استمرار التطابق (لا types مولّدة من DB).
2. **`lib/db` فارغ**: مصدر الحقيقة للـ schema غير موجود → أي تعديل DB لا يولّد types ولا يكشف Breaking changes في CI.
3. **`security_definer_view` على `daily_excel_logs_today`**: تجاوز محتمل لـ RLS.
4. **RLS Policies غير موثّقة ولا مفحوصة**: 26 جدول مفعّل عليها RLS، لكن لا اختبار يثبت أن user عادي لا يقرأ بيانات admin.
5. **Service Role Key**: لا يوجد فحص آلي يمنع تسريبه (لا secret-scan في الريبو).
6. **PayrollDeductions.tsx (7649 سطر)**: ملف واحد عملاق = نقطة فشل ضخمة، typecheck بطيء، وأخطاء صعبة الاكتشاف.

### 🟠 عالية
7. **تكرار مكونات UI**: `DropdownMenu/dropdown-menu`, `EmptyState/empty-state/EmptyState` (كلها بأسماء/Casing مختلفة) — مشاكل عند Windows (case-insensitive) وكسر استيرادات.
8. **`AuthContext.tsx` (1072 سطر)**: منطق session validation + retry + lockout + activity log كله في ملف واحد، صعب اختباره.
9. **`Layout.tsx` (627 سطر) + `Sidebar.tsx` (230) + `MobileBottomNav` + `PillHeader`**: تداخل وتكرار في زر "تحديث الصفحة" بين Sidebar و Layout — منطق مكرر.
10. **`Layout.tsx`**: يلصق `mousemove` listener على كل `.parallax-card` عند كل تغيير route — تسرّب أداء.
11. **`Layout.tsx` ripple على كل click في الـ document**: أثر على الأداء + مشاكل وصول.
12. **عدم وجود Error Boundary على مستوى الصفحات الفردية في كل المسارات**: في `App.tsx` بعض الـ Routes تستخدم `RouteGuard` مع ErrorBoundary، وأخرى `Suspense` فقط → سلوك متقطّع عند الأخطاء.
13. **`vite.config.ts`**: يفرض `PORT` و `BASE_PATH` كمتغيرات إجبارية → أي مطوّر جديد يخفق بدون `.env`.
14. **Supabase client يستخدم `sessionStorage`**: مع `persistSession: true` و `detectSessionInUrl: true` — تعارض منطقي (session تنتهي بإغلاق التبويب لكن مكتوب persistSession).
15. **Health Insurance/Residence Expiry**: الواجهة تعرض حقول، لكن لا اختبار E2E يثبت أنها فعلاً تُحدَّث في DB عند التعديل.
16. **`Notifications/Alerts/ActivityLogs`**: مولّدة من triggers — لا يوجد توثيق يربط trigger ↔ صفحة، ولا اختبار يضمن أن الـ trigger يطلق فعلاً.

### 🟡 متوسطة
17. صفحات اختبار في الإنتاج: `CommercialRegTestPage`, `EnhancedAlertsTestPage`, `DesignSystem`, `SecurityManagement` (شبه فاضية) — يجب حذفها أو حصرها في بيئة dev.
18. `PermissionGuard` و `usePermissions` في مكانين (`utils/permissions` + `hooks/usePermissions`) — مصدر حقيقة مزدوج.
19. `queryClient.ts` بدون مراجعة لإعدادات caching/staleTime/retry → كل صفحة قد تطلب نفس البيانات بشكل مختلف.
20. لا يوجد CI: لا typecheck/lint/test pipeline → أخطاء تصل main.
21. لا Dockerfile لـ api-server.
22. لا backup script آلي لقاعدة بيانات Supabase (`backup_history` جدول موجود لكن غير مفعّل تشغيلياً).
23. `xlsx` مكتبة قديمة بثغرات معروفة (CVE-2024-22363 و prototype pollution) — تحديث أو استبدال.
24. `jspdf` + `html2canvas` تحميل ضخم — يجب lazy load للمستخدمين الذين لا يصدّرون PDF.
25. كل صفحة ترجع `Suspense` بدون `ErrorBoundary` (انظر `/employees`, `/companies`, …) — أي خطأ runtime يكسر الـ app كله.

### 🟢 منخفضة
26. `tw-animate-css` + `framer-motion` + custom CSS animations في نفس المشروع → ازدواج.
27. تكرار `useThemeMode/useFontMode` في `App.tsx` و `Layout.tsx`.
28. `not-found.tsx` (21 سطر) لا يُستخدم في `App.tsx` — لا route catch-all `*`.
29. `sonner` Toaster + `toaster.tsx` + `toast.tsx` (3 ملفات toast) — تكرار.
30. تعليقات Arabic/English مختلطة بدون نمط موحد.

---

## 3. مبادئ الحل (Principles)

1. **Single Source of Truth للـ DB** → `lib/db` يصبح المصدر، types تُولَّد منه.
2. **عقد API** → كل endpoint يدخل `openapi.yaml` قبل الكود.
3. **No Orphan UI Fields**: أي حقل في الواجهة → مرتبط بعمود/علاقة في DB. أي عمود DB → إما مستخدم أو محذوف.
4. **No Orphan DB Columns**: مراجعة كل عمود غير مقروء/غير مكتوب من أي صفحة.
5. **Defense in Depth**: RLS + role check في الـ API + zod validation + permissions في UI = 4 طبقات.
6. **Small Files**: أي صفحة > 500 سطر → تقسيم. أي hook > 200 → تقسيم.
7. **Test Pyramid**: unit (hooks/utils) → integration (component+supabase mock) → E2E (Playwright على الـ flows الحرجة).
8. **CI Gate**: typecheck + lint + test + build لا بد ينجحوا قبل merge.

---

## 4. الخطة بمراحل

### المرحلة 0 — التثبيت السريع (أسبوع 1)
**الهدف**: إيقاف النزيف، لا regressions.

| # | المهمة | الملفات | معيار القبول |
|---|--------|---------|--------------|
| 0.1 | حذف صفحات الاختبار من الإنتاج | `CommercialRegTestPage.tsx`, `EnhancedAlertsTestPage.tsx`, `DesignSystem.tsx`, `SecurityManagement.tsx` (إن لم يُستخدم) | لا route تشير إليها، typecheck نظيف |
| 0.2 | route catch-all 404 | `App.tsx`, `not-found.tsx` | فتح `/random` يعرض 404 |
| 0.3 | حذف الـ duplicate UI files | UI library | بعد الحذف الـ build ينجح |
| 0.4 | إصلاح `daily_excel_logs_today` (إزالة SECURITY DEFINER) | migration جديد | advisor خفّض الـ ERROR |
| 0.5 | إصلاح `function_search_path_mutable` (`SET search_path = public, pg_temp`) | migration | advisor صفر WARN في هذا التصنيف |
| 0.6 | إصلاح `auth_rls_initplan` على `saved_searches` (`(select auth.uid())`) | migration | advisor صفر WARN |
| 0.7 | حذف `permissions_backup_20260120` بعد تأكيد عدم الحاجة | migration | الجدول راح |
| 0.8 | إعداد `vite.config.ts` بـ defaults آمنة (PORT=5173, BASE_PATH=/) | `vite.config.ts` | `pnpm dev` يعمل بدون `.env` كامل |
| 0.9 | إصلاح تعارض `sessionStorage` + `persistSession` (اختر سياسة واحدة وثبّتها) | `lib/supabase.ts` | session تتصرف بشكل متوقع عند close tab |

### المرحلة 1 — الـ Schema Contract (أسبوع 2-3)
**الهدف**: `lib/db` يصبح مصدر الحقيقة.

| # | المهمة | الملفات | معيار |
|---|--------|---------|-------|
| 1.1 | تعريف Drizzle tables لكل الـ 26 جدول | `lib/db/src/schema/*.ts` | `drizzle-kit introspect` على Supabase ثم تنظيف |
| 1.2 | توليد types و export للـ frontend عبر `@workspace/db` | `lib/db/src/index.ts` | `import { Employee } from '@workspace/db'` يعمل |
| 1.3 | استبدال types اليدوية في `artifacts/sawtracker/src/lib/supabase.ts` بـ generated | كل الواجهة | typecheck = 0 errors |
| 1.4 | RLS policies كنصوص migrations مفهرسة (لا تعديل من Supabase Studio) | `supabase/migrations/*` | كل policy موثقة بـ comment + spec test |
| 1.5 | اختبار RLS لكل جدول حساس (admin/manager/user) | `tests/rls/*.spec.ts` | `pnpm test:rls` ينجح |

### المرحلة 2 — العقد API (أسبوع 4)
**الهدف**: كل endpoint له schema موثقة.

| # | المهمة | معيار |
|---|--------|-------|
| 2.1 | تعريف كل endpoints `/api/admin/*` في `openapi.yaml` | `redocly lint` نظيف |
| 2.2 | توليد `@workspace/api-zod` و `@workspace/api-client-react` | imports تعمل |
| 2.3 | الـ frontend يستهلك hooks المولّدة فقط (لا fetch يدوي إلى api-server) | grep لا يجد `fetch('/api/admin` |
| 2.4 | إضافة rate limiting (تم) + audit log middleware | كل عملية admin تترك سجل |
| 2.5 | تغطية routes بـ vitest+supertest (mock Supabase admin) | coverage ≥ 80% |

### المرحلة 3 — تقسيم الصفحات الكبيرة (أسبوع 5-7)
**الهدف**: لا ملف > 500 سطر.

| # | المهمة | معيار |
|---|--------|-------|
| 3.1 | تقسيم `PayrollDeductions.tsx` إلى: `PayrollPage` (orchestrator) + `RunsList` + `RunEditor` + `ComponentsTable` + `EntriesTable` + `Slips` + hooks خاصة | كل ملف ≤ 500 سطر |
| 3.2 | تقسيم `Employees.tsx` إلى: `EmployeesPage` + `EmployeesTable` + `EmployeeForm` + `EmployeeCard` + `EmployeeFilters` | معيار + اختبار |
| 3.3 | تقسيم `AdvancedSearch.tsx` (sections + saved + filters) | معيار |
| 3.4 | تقسيم `Companies.tsx` و `Dashboard.tsx` و `ActivityLogs.tsx` و `GeneralSettings.tsx` | معيار |
| 3.5 | تقسيم `AuthContext.tsx`: `useAuthSession`, `useUserProfile`, `useLoginLockout`, `useSecurityLogger` | كل hook < 200 سطر |
| 3.6 | تقسيم `Layout.tsx`: استخراج `useRipple`, `useParallaxCards`, `useNavItems` ودمج Refresh button في مكان واحد فقط (Sidebar) | < 300 سطر |

### المرحلة 4 — الأداء والاستقرار (أسبوع 8)
**الهدف**: 0 jank، 0 memory leak.

| # | المهمة | معيار |
|---|--------|-------|
| 4.1 | إزالة `mousemove` على كل بطاقة، استبدال بـ CSS-only hover effects أو IntersectionObserver | RUM: Long Task < 50ms |
| 4.2 | إزالة global click ripple → استخدام Tailwind `active:` states | accessibility: لا تأثير على screen reader |
| 4.3 | ضبط `queryClient`: staleTime=30s, gcTime=5min, retry=1 | cache hits ≥ 70% |
| 4.4 | virtualize tables الكبيرة (employees, payroll entries) باستخدام `@tanstack/react-virtual` (موجود فعلاً لكن غير مستخدم) | scroll 1000+ صف بدون lag |
| 4.5 | lazy import لـ `xlsx`, `jspdf`, `html2canvas` فقط داخل handlers الـ Export | initial bundle ≤ 350KB gzip |
| 4.6 | استبدال `xlsx` بـ `exceljs` (أكثر أماناً) أو حصر استخدامها في worker | npm audit: 0 high CVEs |
| 4.7 | إضافة فهارس على الـ FKs المحدّدة في advisor (17 FK) | advisor: 0 unindexed FK |
| 4.8 | حذف الفهارس غير المستخدمة بعد متابعة 30 يوم | حجم DB انخفض |
| 4.9 | ErrorBoundary حول كل Route | كسر صفحة لا يكسر التطبيق كله |
| 4.10 | Sentry: إعدادات مصدر دقيقة، تفعيل replays في staging فقط | dashboards نظيفة |

### المرحلة 5 — اكتمال الواجهة ↔ DB (أسبوع 9)
**الهدف**: لا حقل أرمل، لا عمود مهجور.

| # | المهمة | معيار |
|---|--------|-------|
| 5.1 | جرد لكل عمود في DB → خريطة "أين يُقرأ/يُكتب في الواجهة" (sheet) | مصفوفة كاملة |
| 5.2 | إزالة الأعمدة غير المستخدمة من DB (بعد تأكيد) أو إضافة UI لها | كل عمود له owner واضح |
| 5.3 | فحص كل صفحة: حقول تظهر للمستخدم → موجودة في select الـ supabase ومحفوظة في submit | E2E test لكل صفحة CRUD |
| 5.4 | توحيد expirations (residence/contract/health-insurance/CR) في view واحد + RPC | `generate_expiry_notifications` تشتغل cron يومياً |
| 5.5 | اختبار trigger → notification → UI لكل alert type | manual run + e2e |

### المرحلة 6 — الجودة والاختبارات (أسبوع 10)
**الهدف**: تغطية 70% خطوط حرجة، CI أخضر دائماً.

| # | المهمة | معيار |
|---|--------|-------|
| 6.1 | GitHub Actions: lint + typecheck + test + build على كل PR | green check قبل merge |
| 6.2 | E2E بـ Playwright للـ flows: login, employee CRUD, payroll run, alerts, import-export | 10 سيناريوهات تنجح |
| 6.3 | RLS test suite (Postgres roles مختلفة) | 100% coverage للجداول الحساسة |
| 6.4 | accessibility tests (`vitest-axe` موجود فعلاً) لكل page | 0 violations حرجة |
| 6.5 | Lighthouse CI: Perf ≥ 90, A11y ≥ 95, Best Practices ≥ 95 | thresholds في CI |
| 6.6 | تحديث docs: `CONTEXT.md`, `README.md`, `CONTRIBUTING.md` | قارئ جديد يبدأ في < 30 دقيقة |
| 6.7 | secret-scan (`gitleaks`) على pre-commit و CI | 0 secrets في الـ history |

### المرحلة 7 — DevOps والإنتاج (أسبوع 11)
| # | المهمة | معيار |
|---|--------|-------|
| 7.1 | Dockerfile لـ api-server + healthcheck | `docker run` يعمل |
| 7.2 | Github Actions: deploy api-server (Fly.io/Render) + sawtracker (Vercel/Cloudflare) | deploy تلقائي على main |
| 7.3 | Backups: pg_dump يومي إلى R2/S3 + الجدول `backup_history` يسجّل | 30 نسخة احتياطية متاحة |
| 7.4 | Monitoring: Sentry + Supabase logs + uptime ping | alert على Slack/Email |
| 7.5 | Runbook: ماذا تفعل عند فقدان admin / تسرّب key / تعطّل DB | ملف `RUNBOOK.md` |

---

## 5. خريطة الواجهة ↔ DB (مختصرة)

| الصفحة | الجداول | RPCs | حالة الربط |
|--------|---------|------|-----------|
| Dashboard | employees, companies, projects, notifications, alerts | `generate_expiry_notifications` | ✅ بعد المرحلة 5 |
| Employees | employees + project + company + obligations | — | ✅ |
| Companies | companies (+ employee_count محسوب) | — | ✅ |
| Projects | projects | — | ✅ |
| TransferProcedures | transfer_procedures | — | ✅ |
| Alerts | notifications + read_alerts + daily_alert_logs | `generate_expiry_notifications` | ✅ |
| Notifications | notifications | — | ✅ |
| Reports | aggregate من employees/companies/payroll | TBD RPCs | يحتاج جرد |
| PayrollDeductions | payroll_runs + payroll_entries + components + slips + obligation_lines | عدة RPCs | معقّد — يحتاج جرد دقيق المرحلة 5.1 |
| ImportExport | employees/companies + daily_excel_logs | — | ✅ |
| AdvancedSearch | كل الجداول الرئيسية + saved_searches | — | ✅ |
| ActivityLogs | activity_log + audit_log + security_events + login_attempts + user_sessions | — | يحتاج توحيد view |
| GeneralSettings | system_settings + users + permissions | — | ✅ |

---

## 6. تعريف "تم" (DoD) للنظام
- [ ] typecheck = 0 errors في كل الباقات.
- [ ] lint = 0 warnings.
- [ ] tests: ≥ 70% خطوط في الـ critical paths.
- [ ] CI أخضر على main.
- [ ] Supabase advisor = 0 ERRORS، ≤ 3 INFO.
- [ ] لا ملف > 500 سطر في `pages/`، ولا hook > 200 سطر.
- [ ] لا حقل UI بدون مصدر DB، ولا عمود DB بدون قارئ.
- [ ] Lighthouse Perf ≥ 90 على Dashboard/Employees.
- [ ] backup يومي يعمل، runbook موجود.

---

## 7. المخاطر والتخفيف

| المخاطرة | الاحتمال | الأثر | التخفيف |
|----------|----------|-------|---------|
| تقسيم PayrollDeductions يكسر منطق كائن | عالي | حرج | E2E tests قبل/بعد، فرع منفصل، QA يدوي بسيناريو حقيقي |
| تغيير RLS يحجب admin | متوسط | حرج | اختبارات RLS لكل دور، تطبيق على staging أولاً |
| توليد types من Drizzle لا يطابق Supabase | متوسط | عالي | `drizzle-kit introspect` ثم compare diff قبل اعتماد |
| إعطاء dev defaults يخفي bugs بيئية | منخفض | متوسط | console.warn واضح عند استخدام defaults |

---

*نهاية خطة الـ Architecture. يقابلها ملف التصميم في `003-design-overhaul-plan.md`.*
