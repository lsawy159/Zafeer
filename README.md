# ZaFeer — منصة إدارة الأعمال

نظام إدارة متكامل للأعمال مُصمَّم للسوق الخليجي. يغطي إدارة الموظفين، الشركات، المشاريع، الالتزامات المالية، إجراءات النقل، تنبيهات المستندات، والتقارير.

- **العملة**: SAR (ريال سعودي)
- **اللغة**: عربي فقط (RTL)
- **التواريخ**: `dd/MM/yyyy`
- **Locale**: `ar-SA`
- **آخر تحديث**: 2026-05-30

---

## هيكل المشروع

```
artifacts/
  └── zafeer/             # تطبيق الويب (React 19 + Vite + Tailwind v4)
      └── src/
          ├── pages/      # الصفحات: Dashboard, Employees, Companies, Projects,
          │               #           Alerts, Finance, Reports, ImportExport, ...
          ├── components/ # UI + layout + domain components (80+ component)
          │   ├── layout/ # AppShell, Sidebar, Header, GlobalSearchModal
          │   ├── employees/, companies/, projects/, alerts/, settings/, ...
          │   └── ui/     # shadcn/ui + custom components
          ├── hooks/      # React hooks (35+)
          ├── utils/      # permissions, alerts, dateFormatter, securityLogger, ...
          ├── contexts/   # AuthContext
          └── lib/        # supabase.ts, queryClient, backupService, ...

supabase/
  ├── migrations/         # ~99 migration SQL (schema + RLS) — مصدر الحقيقة للـ schema
  └── functions/          # Edge Functions: daily-notification-run, automated-backup,
                          #   restore-backup, send-alert-report, admin-users, ...

specs/                    # مواصفات الميزات (001-043+)
reports/                  # تقارير وتحليلات المشروع (محلي)
memory/                   # ذاكرة المشروع (محلي فقط — لا يُرفع على GitHub)
```

---

## المتطلبات

| أداة | الإصدار |
|------|---------|
| Node.js | 22+ |
| pnpm | 10.33.4 |
| Supabase CLI | latest |

---

## الإعداد السريع

```bash
# 1. استنسخ الريبو
git clone https://github.com/lsawy159/Zafeer.git
cd Zafeer

# 2. ثبّت التبعيات
pnpm install

# 3. انسخ ملف البيئة وأضف المفاتيح
cp artifacts/zafeer/.env.example artifacts/zafeer/.env
# أضف: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

# 4. شغّل بيئة التطوير
pnpm --filter @workspace/zafeer run dev     # http://localhost:5173
```

## أوامر الـ Workspace

| أمر | الوصف |
|-----|--------|
| `pnpm build` | build كل الحزم |
| `pnpm typecheck` | TypeScript check لكل الـ workspace |
| `pnpm test:rls` | اختبارات RLS |
| `pnpm --filter @workspace/zafeer run dev` | frontend فقط |
| `pnpm --filter @workspace/zafeer run lint` | ESLint |
| `pnpm --filter @workspace/zafeer run lint:strict` | ESLint strict mode |

---

## Backend: Browser → Supabase, مع Edge Functions للعمليات الإدارية

ZaFeer has a single backend path. كل العمليات بتمرّ عبر Supabase مباشرة:

| نوع العملية | المسار |
|---|---|
| أي عملية آمنة بـ user JWT | **Browser → Supabase مباشرة** (RLS تفرض الأمن) |
| عملية تحتاج `service_role` (admin) | **Supabase Edge Function** (`supabase/functions/`) |

> **ملاحظة معمارية (2026-06):** كان فيه خادم Express (`artifacts/api-server/`) قديم بيكرّر عمليات الـ admin محليًا.
> اتشال بالكامل لأن **الواجهة عمرها ما كانت بتناديه في أي بيئة** (لا محلي ولا إنتاج) — كل عمليات الـ admin
> بتمرّ عبر Edge Functions (`admin-users`, `admin-projects`). مفيش "باب تاني" للـ backend.

### Rule: when to add a new operation

- **Browser → Supabase directly (RLS)**: for any operation safe with a user JWT
- **Edge Function**: if you need `service_role` (admin / privileged operation)

### Production Edge Functions

| Function | Purpose |
|---|---|
| `admin-users` | User account management (admin) |
| `admin-projects` | Project soft-delete + extract lifecycle (admin) |
| `automated-backup` | Scheduled full DB backup → Supabase Storage |
| `restore-backup` | Admin-initiated restore from backup |
| `daily-notification-run` | Sends daily alert digest email |
| `send-alert-report` | Sends CSV alert report email |
| `process-email-queue` | Processes queued outgoing emails |
| `send-backup-email` | Sends backup as email attachment |

---

## Architecture

### القاعدة الأساسية (NON-NEGOTIABLE)

```
Frontend → Supabase مباشرة (RLS تفرض الأمن)
admin ops → Supabase Edge Functions (service_role، لا يلمس المتصفح)
supabase/migrations → مصدر الحقيقة للـ schema
migrations فقط — لا تعديل يدوي من Supabase Studio
```

### Users vs Employees

| الجدول | ما هو | يسجّل دخول؟ |
|--------|--------|-------------|
| `users` | فريق إداري داخلي | ✅ نعم |
| `employees` | سجلات HR فقط (عمال) | ❌ أبداً |

`employees` لا تملك `auth.uid()`. RLS يُبنى على `users.role` + `users.permissions` JSONB فقط.

### Stack

- **Frontend**: React 19.1 + TypeScript 5.9 + Vite 7.3 + Tailwind CSS v4.1 + shadcn/ui (Radix)
- **State**: React Query + react-hook-form + zod
- **Backend DB**: Supabase (PostgreSQL + Auth + RLS + pg_cron + Edge Functions)
- **Admin ops**: Supabase Edge Functions (service_role — admin ops فقط)
- **Schema**: `supabase/migrations/` (مصدر الحقيقة)
- **Hosting**: Vercel (frontend) + Supabase cloud (DB + Edge)

### Supabase

- **Project Ref**: `acnkrijhndgbnxabfklx`
- **RLS**: مفعّل على كل الجداول (25 جدول). policies مبنية على `user_has_permission(section, action)` SECURITY DEFINER.
- **Migrations**: `supabase/migrations/` — لا تعديل يدوي من Studio أبداً.
- **Edge Functions**: `daily-notification-run`, `send-alert-report`, `automated-backup`, `restore-backup`, `admin-users`, `admin-projects`, `process-email-queue`, `send-backup-email`
- **RPCs**: `generate_expiry_notifications`, `create_employee_obligation_plan`, `get_all_users_for_admin`, `user_has_permission`, `upsert_payroll_allocations`

### Permissions System

- **تخزين**: `users.permissions` = JSONB array مسطح: `["employees.view", "companies.create", ...]`
- **16 قسم** محدَّدة في `PERMISSIONS_SCHEMA.ts` — SSOT
- **Admin**: يتجاوز كل checks تلقائياً (role = 'admin' → full access)
- **Deny by Default**: مستخدم جديد = صلاحية صفر حتى منح صريح
- **Enforcement**: Frontend (usePermissions hook) + Database (RLS + user_has_permission SECURITY DEFINER)

---

## Pages الرئيسية

| الصفحة | Route | في Sidebar؟ |
|--------|-------|-------------|
| Dashboard | `/dashboard` | ✅ |
| Employees | `/employees` | ✅ |
| Companies | `/companies` | ✅ |
| Projects | `/projects` | ✅ |
| TransferProcedures | `/transfer-procedures` | ✅ |
| Alerts | `/alerts` | ✅ |
| Reports & Statistics | `/reports` | ✅ |
| Finance (Payroll + Extracts + Revenue) | `/finance` | ✅ |
| ImportExport | `/import-export` | ✅ |
| GeneralSettings | `/admin-settings` | ⚙️ admin فقط |

> **ملاحظة**: `/payroll-deductions` و `/extracts` و `/extracts/new` كلها redirects → `/finance`

---

## إحصائيات المشروع (2026-05-30)

| الفئة | العدد |
|-------|-------|
| ملفات Frontend | 324+ |
| Edge Functions | 10 |
| إجمالي الأسطر | 65,000+ |
| Supabase migrations | 99 |
| Specs مكتملة | 43+ |

---

## CI/CD

GitHub Actions: TypeScript check → Lint → Build → Tests → RLS Tests

للتفاصيل: [CONTRIBUTING.md](CONTRIBUTING.md) | [RUNBOOK.md](RUNBOOK.md)

---

## وثائق إضافية

| الملف | الوصف |
|-------|-------|
| [RUNBOOK.md](RUNBOOK.md) | دليل التشغيل والصيانة |
| [CONTRIBUTING.md](CONTRIBUTING.md) | دليل المساهمة |
| [DESIGN.md](DESIGN.md) | قرارات التصميم |
| [PRODUCT.md](PRODUCT.md) | وصف المنتج |
| [reports/](reports/) | تقارير وتحليلات المشروع |
