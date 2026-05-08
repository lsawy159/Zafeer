# Implementation Plan: إصلاح نظام الأدوار والأمان

**Branch**: `001-fix-auth-roles-security` | **Date**: 2026-05-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-fix-auth-roles-security/spec.md`

## Summary

إصلاح 4 مشاكل في `artifacts/api-server`:
1. Role bug — لا يوجد admin في DB (توثيق + seed script)
2. CORS مفتوح → تقييده بـ env var في production
3. لا Zod validation على الـ routes → إضافتها
4. لا `.env.example` → إنشاؤه

## Technical Context

**Language/Version**: TypeScript 5.9 / Node.js 18+
**Primary Dependencies**: Express 5, @supabase/supabase-js 2, Zod (يُضاف), pino 9
**Storage**: Supabase (PostgreSQL) — Supabase Admin SDK
**Testing**: لا توجد tests حالياً — خارج نطاق هذه المهمة
**Target Platform**: Node.js server (ESM, esbuild bundled)
**Project Type**: REST API microservice (admin operations only)
**Performance Goals**: Standard — لا متطلبات خاصة
**Constraints**: service role key سري، لا يُكشف للـ browser، CORS مقيّد في production
**Scale/Scope**: عدد محدود من admin users — لا حاجة لـ rate limiting معقد

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| المبدأ | Gate | الحالة |
|--------|------|--------|
| I. Supabase-First | API server للـ admin ops فقط | ✅ — لا تغيير في هذا |
| III. Type Safety | typecheck يعدي صفر errors | ✅ — نضيف Zod types |
| IV. Security via RLS | service key سري، roles صحيحة | ⚠️ GATE — هذه المهمة نفسها |
| V. Monorepo Discipline | التغييرات في `api-server` فقط | ✅ |

**Constitution Check post-design**: ✅ بعد إضافة Zod + تقييد CORS + seed script

## Project Structure

### Documentation (this feature)

```text
specs/001-fix-auth-roles-security/
├── plan.md              ← هذا الملف
├── research.md          ← Phase 0 ✅
├── data-model.md        ← Phase 1 ✅
├── contracts/
│   └── admin-api.md    ← Phase 1 ✅
└── checklists/
    └── requirements.md ← ✅
```

### Source Code Changes

```text
artifacts/api-server/
├── .env.example                    ← جديد
├── src/
│   ├── app.ts                      ← تعديل CORS
│   ├── lib/
│   │   └── supabaseAdmin.ts        ← تعديل env validation
│   ├── middleware/
│   │   └── auth.ts                 ← لا تغيير (المنطق صحيح)
│   └── routes/
│       └── users.ts                ← إضافة Zod validation
└── src/scripts/
    └── seed-admin.ts               ← جديد

artifacts/api-server/package.json   ← إضافة zod + express-rate-limit dependencies
```

## Implementation Phases

### Phase 1 — Zod + CORS + Env Validation

**الملفات المتأثرة:**

1. `artifacts/api-server/src/app.ts` — CORS env-based
2. `artifacts/api-server/src/routes/users.ts` — Zod schemas
3. `artifacts/api-server/src/lib/supabaseAdmin.ts` — env check
4. `artifacts/api-server/package.json` — إضافة `zod`
5. `artifacts/api-server/.env.example` — جديد

### Phase 2 — Seed Script

6. `artifacts/api-server/src/scripts/seed-admin.ts` — ينشئ أول admin

### Phase 3 — Rate Limiting (متطلب الدستور §Security)

7. `artifacts/api-server/src/middleware/rateLimit.ts` — جديد، يستخدم `express-rate-limit`
8. تطبيق الـ middleware على `/api/admin/*` routes

## Complexity Tracking

| Deviation | Why Needed | Simpler Alternative Rejected |
|-----------|-----------|------------------------------|
| Seed script منفصل | Admin الأول لا يمكن إنشاؤه عبر API (دائرة مغلقة) | Supabase Dashboard — يعمل لكن غير موثق وعرضة للخطأ |
