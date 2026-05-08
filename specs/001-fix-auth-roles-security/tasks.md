# Tasks: إصلاح نظام الأدوار والأمان

**Input**: Design documents from `specs/001-fix-auth-roles-security/`
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

## Format: `[ID] [P?] [Story] Description`

- **[P]**: يمكن تنفيذه بالتوازي (ملفات مختلفة، لا تبعيات)
- **[Story]**: User story المرتبطة (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: إضافة dependency مطلوبة وإعداد هيكل المشروع

- [x] T001 إضافة `zod` لـ `artifacts/api-server/package.json` في قسم `dependencies`
- [x] T002 تشغيل `pnpm install` من root المشروع لتثبيت الـ dependency الجديدة

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: لا توجد تبعيات حجب إضافية — Phase 1 كافي للبدء

**⚠️ CRITICAL**: يجب إكمال T001+T002 قبل أي شيء آخر

**Checkpoint**: بعد T002 — يمكن تنفيذ Phase 3/4/5 بالتوازي

---

## Phase 3: User Story 1 — إدارة المستخدمين بأدوار صحيحة (Priority: P1) 🎯 MVP

**Goal**: كل admin endpoints تعمل بشكل صحيح مع Zod validation — المستخدمون يُنشأون ويُعدَّلون ويُحذفون بأمان

**Independent Test**: أرسل `POST /api/admin/users` بتوكن admin صحيح → يُنشأ المستخدم بـ 201. أرسل بتوكن manager → 403. أرسل body ناقص → 400 مع رسالة واضحة.

### Implementation for User Story 1

- [x] T003 [P] [US1] إنشاء Zod schema `createUserSchema` في أعلى `artifacts/api-server/src/routes/users.ts`:
  ```ts
  const createUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    full_name: z.string().min(1),
    role: z.enum(['manager', 'user']),
    permissions: z.array(z.string()).default([])
  })
  ```
- [x] T004 [US1] استبدال الـ manual validation في `POST /api/admin/users` بـ `createUserSchema.safeParse(req.body)` في `artifacts/api-server/src/routes/users.ts` — إرجاع 400 مع `error.format()` عند فشل الـ validation
- [x] T005 [P] [US1] إنشاء Zod schema `updateUserSchema` في `artifacts/api-server/src/routes/users.ts`:
  ```ts
  const updateUserSchema = z.object({
    full_name: z.string().min(1).optional(),
    role: z.enum(['manager', 'user']).optional(),
    permissions: z.array(z.string()).optional(),
    is_active: z.boolean().optional(),
    password: z.string().min(8).optional()
  }).refine(data => Object.keys(data).length > 0, { message: 'لا توجد بيانات للتحديث' })
  ```
- [x] T006 [US1] استبدال الـ manual validation في `PATCH /api/admin/users/:id` بـ `updateUserSchema.safeParse(req.body)` في `artifacts/api-server/src/routes/users.ts`
- [x] T007 [US1] التحقق من أن `artifacts/api-server/src/middleware/auth.ts` يتحقق من `role === "admin"` — المنطق صحيح بالفعل، لكن أضف تعليق يوضح أن الـ admin يُنشأ خارج الـ API

**Checkpoint**: User Story 1 مكتملة — Zod validation شغّال على كل routes

---

## Phase 4: User Story 2 — تقييد CORS في Production (Priority: P2)

**Goal**: الـ API يقبل فقط طلبات من origins مُعرَّفة في production

**Independent Test**: شغّل الـ server بـ `NODE_ENV=production` و `ALLOWED_ORIGINS=https://example.com` — طلب من `https://evil.com` يُرفض بـ CORS error.

### Implementation for User Story 2

- [x] T008 [P] [US2] استبدال `app.use(cors())` في `artifacts/api-server/src/app.ts` بـ:
  ```ts
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) ?? []
  app.use(cors({
    origin: process.env.NODE_ENV === 'development' ? true : allowedOrigins,
    credentials: true,
  }))
  ```
- [x] T009 [US2] إضافة env validation في `artifacts/api-server/src/app.ts` — في production، إذا كان `ALLOWED_ORIGINS` فارغاً ارفع `Error` لإيقاف الـ server فوراً (fail-fast — يطابق FR-006). في development يُسمح بالفراغ.

**Checkpoint**: User Story 2 مكتملة — CORS مقيّد في production

---

## Phase 5: User Story 3 — توثيق Setup للمطوّرين (Priority: P3)

**Goal**: مطوّر جديد يشغّل المشروع في أقل من 10 دقائق باتباع `.env.example`

**Independent Test**: مطوّر جديد يتبع `.env.example` فقط ويشغّل `pnpm dev` بنجاح بلا خطأ.

### Implementation for User Story 3

- [x] T010 [P] [US3] إنشاء `artifacts/api-server/.env.example` بالمحتوى التالي:
  ```env
  # Supabase
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

  # Server
  NODE_ENV=development
  PORT=3000

  # CORS — قائمة origins مفصولة بفاصلة (production فقط)
  # مثال: https://app.example.com,https://admin.example.com
  ALLOWED_ORIGINS=

  # Admin Setup
  # لإنشاء أول admin: شغّل scripts/seed-admin.ts بعد تعبئة هذا الملف
  # ADMIN_EMAIL=admin@yourcompany.com
  # ADMIN_PASSWORD=strong-password-here
  # ADMIN_FULL_NAME=مدير النظام
  ```
- [x] T011 [P] [US3] إنشاء `artifacts/api-server/src/scripts/seed-admin.ts` — سكريبت يستخدم `supabaseAdmin` لإنشاء user في Auth + profile بدور `admin`:
  ```ts
  // شغّل: node --env-file=.env ./dist/scripts/seed-admin.mjs
  // أو: tsx src/scripts/seed-admin.ts
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  const full_name = process.env.ADMIN_FULL_NAME ?? 'مدير النظام'
  // إنشاء auth user → إنشاء profile بـ role: 'admin'
  ```
- [x] T012 [US3] التحقق من أن `artifacts/api-server/src/lib/supabaseAdmin.ts` يُوقف الـ server برسالة واضحة إذا غابت `SUPABASE_URL` أو `SUPABASE_SERVICE_ROLE_KEY` — موجود بالفعل، تأكد فقط من وضوح رسالة الخطأ

**Checkpoint**: User Story 3 مكتملة — مطوّر جديد يقدر يشغّل المشروع

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T013 [P] تشغيل `pnpm run typecheck` من root والتأكد من مرور بلا أخطاء
- [x] T014 [P] التأكد من إعدادات `.gitignore`: ملفات `.env` و `.env.*` مُتجاهلة (تحوي أسرار)، لكن `.env.example` و `.env.template` مستثناة (`!.env.example`) ليتم commit لها

---

## Phase 7: Rate Limiting (متطلب الدستور §Security)

**Goal**: حماية admin endpoints من brute force وabuse عبر rate limiting

**Independent Test**: أرسل 101 طلب من نفس الـ IP خلال 15 دقيقة → الطلب الأخير يرجع 429.

- [x] T015 [P] إضافة `express-rate-limit` لـ `artifacts/api-server/package.json` في قسم `dependencies`
- [x] T016 إنشاء `artifacts/api-server/src/middleware/rateLimit.ts` — يصدّر `adminRateLimiter` من `express-rate-limit` بـ `windowMs=15min`, `limit=100`, قابل للتعديل عبر `RATE_LIMIT_WINDOW_MS` و `RATE_LIMIT_MAX`
- [x] T017 ربط `adminRateLimiter` على `/admin` في `artifacts/api-server/src/routes/users.ts` (قبل `requireAdmin`) — يحمي كل admin routes
- [x] T018 [P] إضافة `RATE_LIMIT_WINDOW_MS` و `RATE_LIMIT_MAX` في `artifacts/api-server/.env.example` مع شرح القيم الافتراضية

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 → T002 — لا تبعيات، ابدأ فوراً
- **Foundational (Phase 2)**: لا توجد — Phase 1 كافي
- **User Stories (Phase 3/4/5)**: جميعها تبدأ بعد T002 — يمكن تنفيذها بالتوازي
- **Polish (Phase 6)**: بعد اكتمال جميع الـ User Stories

### Within Each User Story

- T003 و T005 [P] — موازيان (ملفات/schemas مختلفة)
- T004 يتبع T003
- T006 يتبع T005
- T008 و T009 مستقلان ضمن US2
- T010 و T011 [P] موازيان ضمن US3

### Parallel Opportunities

```
بعد T002:
  ┌── Phase 3 (US1): T003+T005 معاً → T004 → T006 → T007
  ├── Phase 4 (US2): T008+T009 معاً
  └── Phase 5 (US3): T010+T011 معاً → T012
```

---

## Implementation Strategy

### MVP First (User Story 1 فقط)

1. T001 → T002 (Setup)
2. T003 → T004 → T005 → T006 → T007 (US1)
3. **توقف وتحقق**: أرسل requests للـ admin endpoints واختبر الـ validation
4. MVP جاهز — الـ admin CRUD شغّال بأمان

### Incremental Delivery

1. Setup → US1 (Zod validation) → اختبر → ✅
2. US2 (CORS fix) → اختبر → ✅
3. US3 (.env.example + seed) → اختبر → ✅
4. Polish → `pnpm typecheck` → ✅

---

## Notes

- [P] = ملفات مختلفة، لا تبعيات — يمكن التوازي
- لا tests مطلوبة في هذه المهمة (لم تُطلب في الـ spec)
- الـ rollback في `POST /api/admin/users` موجود بالفعل — لا تعديل
- `auth.ts` منطق صحيح — لا تغيير في الـ logic، فقط توثيق
