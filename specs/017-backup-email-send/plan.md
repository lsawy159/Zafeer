# Implementation Plan: إرسال النسخة الاحتياطية بالبريد الإلكتروني

**Branch**: `017-backup-email-send` | **Date**: 2026-05-21 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/017-backup-email-send/spec.md`

## Summary

إضافة زر "إرسال بالبريد" على كل نسخة احتياطية مكتملة في قسم النسخ الاحتياطية. عند الضغط تظهر نافذة لإدخال البريد الإلكتروني، ثم يُرسَل رابط تحميل مؤقت (Signed URL لمدة 24 ساعة) إلى البريد المُدخل عبر خدمة Resend.

## Technical Context

**Language/Version**: TypeScript (React frontend) + Deno (Supabase Edge Function)  
**Primary Dependencies**: Resend SDK (`https://esm.sh/resend@latest`), Supabase JS Client, React, Lucide Icons  
**Storage**: Supabase Storage (موجود — bucket `backups`)  
**Testing**: Manual browser testing  
**Target Platform**: Web (RTL Arabic UI)  
**Project Type**: Web application (monorepo — `artifacts/zafeer` frontend + `supabase/functions` Edge Functions)  
**Performance Goals**: رد Edge Function في < 5 ثوانٍ  
**Constraints**: حجم المرفقات غير محدود (نرسل رابط لا ملف) — مقيّد بحد Resend (3000 بريد/شهر free tier)  
**Scale/Scope**: استخدام داخلي — admin فقط — عدد محدود من الإرسالات

## Constitution Check

### Principle I: Supabase-First ✅
Frontend يستدعي `supabase.functions.invoke('send-backup-email', ...)` مباشرة. لا Express layer.

### Principle II: Arabic UX — RTL First ✅
كل النصوص عربية. تصميم RTL. واجهة البريد بالعربية.

### Principle III: Type Safety ✅
الـ Modal والـ service function بـ TypeScript كامل. لا `any`.

### Principle IV: Security via RLS ✅
Edge Function تتحقق من `admin` role على `users` table قبل الإرسال. Signed URL بانتهاء 24h.  
`RESEND_API_KEY` في Supabase secrets — لا في frontend أبداً.

### Principle V: Monorepo Package Discipline ✅
لا shared packages جديدة. `sendBackupByEmail` helper في `artifacts/zafeer/src/lib/backupService.ts`.

### Principle VI: Brand Identity ✅
لا ذكر لـ SawTracker. كل نصوص البريد تستخدم "زفير".

### Principle VII: Users vs Employees ✅
لا علاقة بـ employees. فقط `users.role` للتحقق.

## Project Structure

### Documentation (this feature)

```text
specs/017-backup-email-send/
├── plan.md              ← هذا الملف
├── research.md          ← Phase 0
├── data-model.md        ← Phase 1
├── contracts/
│   └── send-backup-email.md
└── tasks.md             ← Phase 2 (speckit-tasks)
```

### Source Code Changes

```text
artifacts/zafeer/src/
├── components/settings/backup/
│   ├── BackupListItem.tsx          ← إضافة زر + استدعاء Modal
│   └── SendEmailModal.tsx          ← NEW: Modal إدخال البريد
└── lib/
    └── backupService.ts            ← إضافة sendBackupByEmail()

supabase/functions/
└── send-backup-email/
    └── index.ts                    ← NEW: Edge Function
```

## Implementation Steps

### Step 1: Edge Function `send-backup-email`

**File**: `supabase/functions/send-backup-email/index.ts`

Logic:
1. CORS headers + OPTIONS handler
2. Auth check: extract JWT → lookup `users.role` → require `admin`
3. Parse body: `{ backup_id, recipient_email }`
4. Validate: UUID format + email format
5. Fetch `backup_history` row → verify `status = 'completed'`
6. Generate Signed URL: `storage.from('backups').createSignedUrl(file_path, 86400)` (24h)
7. Send via Resend: HTML email with download link
8. Return `{ success: true }`

### Step 2: `sendBackupByEmail()` في backupService

**File**: `artifacts/zafeer/src/lib/backupService.ts`

```typescript
export async function sendBackupByEmail(backupId: string, recipientEmail: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('send-backup-email', {
    body: { backup_id: backupId, recipient_email: recipientEmail },
  })
  if (error) throw error
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(String(data.error))
  }
}
```

### Step 3: `SendEmailModal.tsx`

**File**: `artifacts/zafeer/src/components/settings/backup/SendEmailModal.tsx`

- Modal بسيط: حقل email + زر إرسال + زر إلغاء
- Validate صيغة البريد client-side قبل الإرسال
- `useMutation` لاستدعاء `sendBackupByEmail`
- Loading state + error/success toast
- إغلاق تلقائي عند النجاح

### Step 4: تحديث `BackupListItem.tsx`

- إضافة زر "إرسال بالبريد" بجانب "تحميل CSV"
- `import { Mail } from 'lucide-react'`
- `useState<boolean>` لفتح/إغلاق `SendEmailModal`
- تمرير `backup.id` للـ Modal

## Complexity Tracking

لا انتهاكات للـ Constitution. الميزة بسيطة: Modal + Edge Function + Resend.

## Notes

- `RESEND_API_KEY` يحتاج إضافة يدوية في Supabase Dashboard → Settings → Edge Functions → Secrets
- `RESEND_FROM_EMAIL` يحتاج domain verification في Resend (أو استخدام `onboarding@resend.dev` للتجربة)
- Resend free tier: 3,000 emails/month — كافٍ للاستخدام الداخلي
