# Tasks: إرسال النسخة الاحتياطية بالبريد الإلكتروني

**Input**: Design documents from `/specs/017-backup-email-send/`  
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

**Tests**: لا اختبارات آلية — اختبار يدوي في المتصفح (T010).

**Organization**: Tasks organized by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1, US2, US3 (maps to spec.md priorities)

---

## Phase 1: Setup

**Purpose**: توثيق متطلبات البيئة — لا تغييرات في DB ولا packages جديدة.

- [X] T001 Create developer reference file at `supabase/functions/send-backup-email/.env.example` with `RESEND_API_KEY` and `RESEND_FROM_EMAIL` placeholders — note: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected by Supabase runtime, no manual setup needed

---

## Phase 2: Foundational (Blocking Prerequisite)

**Purpose**: Edge Function هي الأساس الذي يعتمد عليه كل شيء — يجب أن تكتمل أولاً.

**⚠️ CRITICAL**: لا يمكن بناء الـ frontend قبل تجهيز هذا الـ endpoint.

- [X] T002 Create Supabase Edge Function at `supabase/functions/send-backup-email/index.ts` that:
  - Handles CORS (OPTIONS + POST only)
  - Extracts JWT and verifies `users.role = 'admin'` via service role client
  - Parses and validates body: `{ backup_id: string, recipient_email: string }` (UUID + email regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
  - Fetches `backup_history` row and verifies `status = 'completed'` (all types accepted: full/scheduled/pre-restore-snapshot), returns 404 if not found
  - Generates Supabase Storage Signed URL for `file_path` with 86400 second (24h) expiry
  - Generates CSV ZIP: download + decompress `file_path` (`.json.gz` — ref: `supabase/functions/automated-backup/index.ts` `gzipString()`) from Storage → parse JSON `tables` key → convert each table array to CSV (UTF-8 BOM, comma delimiter, RFC 4180) → zip all as `tableName.csv` files via `https://esm.sh/jszip@latest` → check raw ZIP size: if >25MB return 413 with Arabic error message, ZIP MUST NOT be uploaded to Storage
  - Sends HTML email via Resend SDK (`https://esm.sh/resend@latest`): `<html dir="rtl" lang="ar">` body with backup date/type/size/JSON link/24h warning + ZIP attachment (`application/zip`, base64)
  - Returns `{ success: true }` or `{ error: "..." }` with appropriate HTTP status

**Checkpoint**: Edge Function deployed — test via `supabase functions serve` locally before proceeding.

---

## Phase 3: User Story 1 — إرسال النسخة بالبريد (Priority: P1) 🎯 MVP

**Goal**: زر يظهر على كل نسخة مكتملة → modal → إدخال بريد → إرسال → toast نجاح.

**Independent Test**: اضغط "إرسال بالبريد" على نسخة `completed`، أدخل بريدًا صالحًا، اضغط "إرسال" — تصل رسالة إلى صندوق البريد وتظهر toast نجاح وتُغلق النافذة.

- [X] T003 [P] [US1] Add `sendBackupByEmail(backupId: string, recipientEmail: string): Promise<void>` to `artifacts/zafeer/src/lib/backupService.ts` — calls `supabase.functions.invoke('send-backup-email', { body: { backup_id, recipient_email } })` and throws on error (including `data.error` pattern)

- [X] T004 [US1] Create `artifacts/zafeer/src/components/settings/backup/SendEmailModal.tsx` — modal with: RTL layout, email input (`type="email"`), "إرسال" button using `useMutation` calling `sendBackupByEmail`, "إلغاء" button, `toast.success` on success + auto-close, `toast.error` on failure

- [X] T005 [US1] Update `artifacts/zafeer/src/components/settings/backup/BackupListItem.tsx` — add `import { Mail } from 'lucide-react'`, add `useState<boolean>` for modal open state, add "إرسال بالبريد" button (styled same as existing action buttons, `completed` status only — all backup types including snapshots), render `<SendEmailModal>` with `backup.id` and `onClose`

**Checkpoint**: MVP كامل — زر + modal + إرسال + toast. اختبر يدوياً قبل الانتقال.

---

## Phase 4: User Story 2 — التحقق من صحة البريد (Priority: P2)

**Goal**: رسالة خطأ عربية تظهر فوراً عند إدخال بريد بصيغة غير صحيحة أو ترك الحقل فارغاً — قبل أي طلب للـ server.

**Independent Test**: في الـ modal، أدخل "notanemail" واضغط "إرسال" — يجب أن تظهر رسالة خطأ تحت الحقل ولا يُرسَل طلب للـ server.

- [X] T006 [US2] Add client-side validation to `artifacts/zafeer/src/components/settings/backup/SendEmailModal.tsx` — before calling mutation: check empty input (رسالة: "يرجى إدخال البريد الإلكتروني") and invalid email format via regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` (رسالة: "البريد الإلكتروني غير صالح") — display error message below input field, clear on input change

**Checkpoint**: محاولة إرسال ببريد غير صالح تعرض خطأ بدون request.

---

## Phase 5: User Story 3 — حالة التحميل والخطأ أثناء الإرسال (Priority: P3)

**Goal**: مؤشر تحميل أثناء الإرسال + تعطيل الزر لمنع double-submit + عرض خطأ server مع إمكانية إعادة المحاولة.

**Independent Test**: اضغط "إرسال" ببريد صالح — يظهر spinner ويُعطَّل الزر. عند فشل الـ Edge Function — تظهر رسالة الخطأ والنافذة تبقى مفتوحة.

- [X] T007 [US3] Add loading state to `artifacts/zafeer/src/components/settings/backup/SendEmailModal.tsx` — use `mutation.isPending` to: show `<Loader2 className="animate-spin">` في زر "إرسال"، disable زر "إرسال" فقط لمنع double-submit، تغيير نص زر "إرسال" إلى "جاري الإرسال..." — زر "إلغاء" يبقى فعّالاً دائماً في جميع الحالات

- [X] T008 [US3] Add inline error display to `artifacts/zafeer/src/components/settings/backup/SendEmailModal.tsx` — عند `mutation.isError` اعرض رسالة الخطأ المُرجَعة من الـ server داخل الـ modal (الـ modal يبقى مفتوحاً). منطق عرض زر "حاول مرة أخرى": يظهر فقط لأخطاء الشبكة/500 — **يُخفى** عند خطأ 413 (حجم الملف ثابت ولن يتغير بالإعادة)، وعند 413 أضف رابط "تحميل يدوي" بدلاً منه

**Checkpoint**: لا يمكن الضغط المزدوج. فشل الإرسال يُبقي الـ modal مفتوحاً مع رسالة واضحة.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T009 [P] Verify `import { Mail } from 'lucide-react'` doesn't conflict with existing imports in `BackupListItem.tsx` — run `pnpm run typecheck` from repo root, fix any TypeScript errors
- [ ] T010 End-to-end browser test — verify all flows:
  1. Success: press send with valid email → confirm email arrives in inbox, toast shows, modal closes
  2. Client-side validation: enter "notanemail" → error shows, NO network request sent (check DevTools)
  3. Server-side validation: bypass client via DevTools/curl with invalid email → confirm 400 response
  4. ZIP size error: if testable, trigger 413 → confirm modal shows error without retry button, shows download link instead
  5. Network error: confirm modal stays open with error + retry button visible
  6. Timing: measure from button click to toast — MUST be < 60 seconds (SC-001)
- [ ] T011 [P] Verify Resend secrets configured before deploy: confirm `RESEND_API_KEY` + `RESEND_FROM_EMAIL` added in Supabase Dashboard → Settings → Edge Functions → Secrets (or test with `onboarding@resend.dev` for dev environment)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: لا dependencies — ابدأ فوراً
- **Foundational (Phase 2)**: Depends on Phase 1 — يمنع بدء Phase 3
- **US1 (Phase 3)**: Depends on Phase 2 — MVP تام
- **US2 (Phase 4)**: يعتمد على T004 من Phase 3 (نفس الملف)
- **US3 (Phase 5)**: يعتمد على T004 من Phase 3 (نفس الملف)
- **Polish (Phase 6)**: بعد كل user stories

### User Story Dependencies

- **US1 (P1)**: T003 [P] و T004/T005 تتوازى — T005 يعتمد على T004
- **US2 (P2)**: يعتمد على T004 (تعديل نفس الـ Modal)
- **US3 (P3)**: يعتمد على T004 (تعديل نفس الـ Modal)

> ⚠️ **T006 → T007 → T008 يجب تنفيذها بالتسلسل** — كلها تُعدّل `SendEmailModal.tsx`. لا تتوازى.

### Parallel Opportunities

- T001 و T002 تتوازى (ملفات مختلفة)
- T003 و T004 تتوازان (ملفات مختلفة — backupService.ts و SendEmailModal.tsx)
- T009 و T011 تتوازان

---

## Parallel Example: User Story 1

```bash
# Two tasks can run simultaneously:
Task T003: "Add sendBackupByEmail() in artifacts/zafeer/src/lib/backupService.ts"
Task T004: "Create SendEmailModal.tsx in artifacts/zafeer/src/components/settings/backup/"

# Then T005 depends on both:
Task T005: "Update BackupListItem.tsx to add button and wire modal"
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Complete Phase 1: T001 — env vars documented
2. Complete Phase 2: T002 — Edge Function deployed
3. Complete Phase 3: T003 → T004 → T005
4. **STOP و VALIDATE**: اختبر في المتصفح — هل يصل البريد؟
5. إذا نجح MVP → تابع US2/US3

### Incremental Delivery

1. T001 + T002 → Foundation ready
2. T003/T004 (parallel) + T005 → US1 MVP ✅
3. T006 → US2 (validation) ✅
4. T007 + T008 → US3 (loading/error) ✅
5. T009/T010/T011 → Polish ✅

---

## Notes

- [P] = ملفات مختلفة، لا تعارض
- [Story] = US1/US2/US3 من spec.md
- **T002 critical**: بدون Edge Function لا يمكن اختبار أي شيء — يجب deploy قبل T003/T004
- **Resend setup**: قبل T002 تأكد من وجود حساب Resend وـ domain verification (أو استخدم `onboarding@resend.dev` للتجربة)
- **TypeScript**: بعد كل ملف جديد → `pnpm run typecheck` في `artifacts/zafeer`
