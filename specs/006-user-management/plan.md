# Implementation Plan: إدارة المستخدمين

**Branch**: `006-user-management` | **Date**: 2026-05-16 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/006-user-management/spec.md`

## Summary

إضافة واجهة إدارة المستخدمين في صفحة الإعدادات: إنشاء مستخدم جديد وتعديل بيانات مستخدم موجود (الاسم/الدور) وتفعيل/تعطيل المستخدمين. Backend API كاملة موجودة بالفعل (POST/GET/PATCH `/api/admin/users`). العمل frontend فقط — wrapper hooks + dialog components + تحديث `UsersPermissionsTab`.

## Technical Context

**Language/Version**: TypeScript 5.x  
**Primary Dependencies**: React 18, shadcn/ui (Dialog, Select, Form), React Hook Form, Zod, TanStack Query  
**Storage**: Supabase (direct for reads), Express API via Vite proxy for writes (already configured in Spec 005)  
**Target Platform**: Web — `artifacts/zafeer`  
**Project Type**: Web application (frontend only for this spec)  
**Constraints**: RTL layout, Arabic text, Gulf market (SAR)  
**Scale/Scope**: ~4 new files, ~1 modified file

### Existing Assets (no changes needed)

| Asset | Location | Status |
|-------|----------|--------|
| `POST /api/admin/users` | `artifacts/api-server/src/routes/users.ts:17` | ✅ موجود |
| `PATCH /api/admin/users/:id` | `artifacts/api-server/src/routes/users.ts:79` | ✅ موجود |
| `useCreateAdminUser` hook | `lib/api-client-react/src/generated/api.ts:262` | ✅ موجود |
| `useUpdateAdminUser` hook | `lib/api-client-react` | ✅ موجود |
| Vite proxy `/api → localhost:3000` | `artifacts/zafeer/vite.config.ts` | ✅ Spec 005 |
| `useForceResetPassword` wrapper | `src/hooks/useForceResetPassword.ts` | ✅ Spec 005 |
| `PasswordResetDialog` | `src/components/settings/tabs/PasswordResetDialog.tsx` | ✅ Spec 005 |

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I — Supabase-First | ✅ | Reads: Supabase direct. Writes: Express API (service role required) |
| II — Arabic RTL | ✅ | كل النصوص عربية، `dir="rtl"` |
| III — Type Safety | ✅ | TypeScript، Zod، generated types من `lib/api-zod` |
| IV — Security via RLS | ✅ | `requireAdmin` middleware موجود على كل endpoints |
| V — Monorepo Discipline | ✅ | لا تغييرات في `lib/` — API موجودة بالكامل |
| VI — Brand Identity | ✅ | لا أسماء legacy |
| VII — Users vs Employees | ✅ | نعمل على `users` table فقط |

## Project Structure

### Documentation (this feature)

```text
specs/006-user-management/
├── plan.md              ← this file
├── research.md          ← Phase 0
├── data-model.md        ← Phase 1
├── quickstart.md        ← Phase 1
└── tasks.md             ← /speckit-tasks output
```

### Source Code Changes

```text
artifacts/zafeer/src/
├── hooks/
│   ├── useCreateUser.ts              (NEW) — wraps useCreateAdminUser, injects Bearer token
│   └── useUpdateUserProfile.ts       (NEW) — wraps useUpdateAdminUser, injects Bearer token
└── components/settings/tabs/
    ├── CreateUserDialog.tsx           (NEW) — إنشاء مستخدم جديد
    ├── EditUserDialog.tsx             (NEW) — تعديل اسم/دور المستخدم
    └── UsersPermissionsTab.tsx        (MODIFIED) — إضافة زر "إضافة مستخدم" + زر "تعديل"
```

## Complexity Tracking

لا مخالفات — العمل frontend فقط، API موجودة، بدون packages جديدة.
