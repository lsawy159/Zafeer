# ZaFeer — منصة إدارة الأعمال

نظام إدارة متكامل للأعمال مُصمَّم للسوق الخليجي. يغطي إدارة الموظفين، الشركات، المشاريع، الالتزامات المالية، إجراءات النقل، تنبيهات المستندات، والتقارير.

- **العملة**: SAR (ريال سعودي)
- **اللغة**: عربي فقط (RTL)
- **التواريخ**: `dd/MM/yyyy`
- **Locale**: `ar-SA`

---

## هيكل المشروع

```
artifacts/
  ├── api-server/         # خادم Express للعمليات الإدارية (service_role فقط)
  ├── zafeer/             # تطبيق الويب (React 19 + Vite + Tailwind v4)
  │   └── src/
  │       ├── pages/      # 14 صفحة (Dashboard, Employees, Companies, Projects, ...)
  │       ├── components/ # UI + layout + domain components
  │       │   └── stats/  # StatsDashboard, StatCard, StatsDetailModal
  │       ├── types/      # statsTypes + shared types
  │       └── utils/      # statsCalculator, permissions, autoCompanyStatus, ...

lib/
  ├── api-client-react/   # React Query hooks مولَّدة من OpenAPI
  ├── api-spec/           # OpenAPI YAML (source of truth)
  ├── api-zod/            # Zod schemas مولَّدة من OpenAPI
  └── db/                 # Drizzle ORM schema (25 جدول)

supabase/
  ├── migrations/         # ~60+ migration SQL (schema + RLS)
  └── functions/          # Edge Functions
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
pnpm --filter @workspace/api-server run dev  # http://localhost:3000
```

### Docker (بديل)

```bash
pnpm docker:up    # يشغّل api-server + zafeer معاً
pnpm docker:down
```

---

## أوامر الـ Workspace

| أمر | الوصف |
|-----|--------|
| `pnpm build` | build كل الحزم |
| `pnpm typecheck` | TypeScript check لكل الـ workspace |
| `pnpm --filter @workspace/zafeer run dev` | frontend فقط |
| `pnpm --filter @workspace/zafeer run lint` | ESLint |
| `pnpm --filter @workspace/zafeer run lint:strict` | ESLint strict mode |
| `pnpm --filter @workspace/api-server run dev` | backend فقط |

---

## Architecture

### القاعدة الأساسية (NON-NEGOTIABLE)

```
Frontend → Supabase مباشرة (RLS تفرض الأمن)
Express API → admin ops فقط (service_role، لا يلمس المتصفح)
lib/db Drizzle → مصدر الحقيقة للـ schema
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
- **Backend DB**: Supabase (PostgreSQL + Auth + RLS + pg_cron)
- **Admin API**: Express 5 (service_role — admin ops فقط)
- **Schema**: Drizzle ORM (`lib/db/`)
- **API Spec**: OpenAPI YAML → Zod + React Query hooks (orval)
- **Hosting**: Vercel

### Supabase

- **Project Ref**: `acnkrijhndgbnxabfklx`
- **RLS**: مفعّل على كل الجداول. policies مبنية على `user_has_permission(section, action)` SECURITY DEFINER.
- **Migrations**: `supabase/migrations/` — لا تعديل يدوي من Studio أبداً.
- **RPCs**: `generate_expiry_notifications`, `create_employee_obligation_plan`, `get_all_users_for_admin`, `user_has_permission`.

### Permissions System

- **تخزين**: `users.permissions` = JSONB array مسطح: `["employees.view", "companies.create", ...]`
- **16 قسم** محدَّدة في `PERMISSIONS_SCHEMA.ts`
- **Admin**: يتجاوز كل checks تلقائياً
- **Sidebar**: 11 عنصر operational (مرئي للكل) + 3 عناصر admin (محمية)

---

## Local Planning Notes

Planning and assistant-specific files are local-only and are intentionally not tracked in GitHub.

## Pages الرئيسية

| الصفحة | Route | في Sidebar؟ |
|--------|-------|-------------|
| Dashboard | `/dashboard` | ✅ |
| Employees | `/employees` | ✅ |
| Companies | `/companies` | ✅ |
| Projects | `/projects` | ✅ |
| TransferProcedures | `/transfer-procedures` | ✅ |
| AdvancedSearch | `/advanced-search` | ✅ |
| Alerts | `/alerts` | ✅ |
| Reports (+ إحصائيات) | `/reports` | ✅ |
| PayrollDeductions | `/payroll-deductions` | ✅ |
| ImportExport | `/import-export` | ✅ |
| Notifications | `/notifications` | ✅ |
| GeneralSettings | `/general-settings` | ⚙️ admin فقط |
| ActivityLogs | `/activity-logs` | ❌ يُفتح من Header |
| Permissions | `/permissions` | ❌ يُفتح من إدارة المستخدمين |

---

## CI/CD

GitHub Actions: TypeScript check → Lint → Build → Tests → RLS Tests

للتفاصيل: [CONTRIBUTING.md](CONTRIBUTING.md) | [RUNBOOK.md](RUNBOOK.md)
