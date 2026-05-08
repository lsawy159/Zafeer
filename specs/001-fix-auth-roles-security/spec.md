# Feature Specification: إصلاح نظام الأدوار والأمان

**Feature Branch**: `001-fix-auth-roles-security`
**Created**: 2026-05-07
**Status**: Draft
**Input**: User description: "إصلاح نظام الأدوار والأمان - role admin مفقود وCORS مفتوح ومتطلبات production"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — مدير النظام يُنشئ مستخدمين ويديرهم (Priority: P1)

المدير (admin) يسجل دخوله ويستخدم لوحة الإدارة لإنشاء حسابات موظفين جدد وتعديل أدوارهم وتعطيل حساباتهم.

**Why this priority**: إدارة المستخدمين هي العملية الأساسية في الـ api-server — بدونها النظام لا يعمل.

**Independent Test**: يمكن اختباره بإرسال `POST /api/admin/users` بتوكن admin صحيح ومشاهدة إنشاء المستخدم.

**Acceptance Scenarios**:

1. **Given** مستخدم بدور `admin` يرسل توكن صحيح, **When** يطلب `POST /api/admin/users`, **Then** يُنشأ المستخدم وتعود الاستجابة 201
2. **Given** مستخدم بدور `manager` يرسل توكن صحيح, **When** يطلب `POST /api/admin/users`, **Then** ترفض الاستجابة بـ 403
3. **Given** مستخدم بدون توكن, **When** يطلب أي admin endpoint, **Then** ترفض الاستجابة بـ 401

---

### User Story 2 — النظام يرفض طلبات من مصادر غير مصرح بها (Priority: P2)

في بيئة production، الـ API يقبل فقط طلبات من domains المعروفة — لا يقبل طلبات من أي موقع عشوائي.

**Why this priority**: CORS المفتوح يتيح لأي موقع استدعاء الـ admin API بتوكن مسروق.

**Independent Test**: إرسال طلب من domain غير مدرج يُرجع CORS error.

**Acceptance Scenarios**:

1. **Given** طلب من `https://sawtracker.app` (domain مصرح), **When** يصل الـ API, **Then** يُقبل مع الـ headers الصحيحة
2. **Given** طلب من `https://evil.example.com`, **When** يصل الـ API في production, **Then** يُرفض بـ CORS error
3. **Given** بيئة development, **When** يأتي طلب من localhost, **Then** يُقبل بغض النظر عن الـ domain

---

### User Story 3 — مطوّر جديد يشغّل المشروع بدون تخمين (Priority: P3)

مطوّر يستنسخ المشروع ويجد ملف `.env.example` واضح يشرح كل متغير مطلوب وقيمته المتوقعة.

**Why this priority**: بدون توثيق الـ environment variables، المشروع لا يشتغل على أي machine غير الأصلية.

**Independent Test**: مطوّر جديد يتبع التعليمات فقط ويشغّل `pnpm dev` بنجاح.

**Acceptance Scenarios**:

1. **Given** ملف `.env.example` موجود, **When** المطوّر ينسخه لـ `.env` ويعبّئه, **Then** الـ server يشتغل بلا أخطاء
2. **Given** متغير مطلوب غير موجود في `.env`, **When** يبدأ الـ server, **Then** يظهر رسالة خطأ واضحة بالمتغير الناقص

---

### Edge Cases

- ماذا يحدث إذا أُنشئ user في Supabase Auth لكن فشل إنشاء الـ profile؟ (rollback مطلوب)
- ماذا يحدث إذا طُلب حذف آخر admin في النظام؟
- هل يُسمح لـ admin بتغيير دور نفسه؟

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: النظام MUST يعرّف ثلاثة أدوار فقط: `admin`, `manager`, `user` — بشكل متسق في middleware وقاعدة البيانات
- **FR-002**: `requireAdmin` middleware MUST يتحقق من دور `admin` وهذا الدور MUST موجود فعلاً في الـ `users` table
- **FR-003**: `POST /api/admin/users` MUST يتيح إنشاء users بأدوار `manager` أو `user` فقط — الـ `admin` يُنشأ مباشرة في Supabase
- **FR-004**: CORS MUST يقرأ قائمة الـ allowed origins من environment variable في production
- **FR-005**: جميع الـ request bodies MUST تُتحقق منها بـ Zod schema قبل المعالجة
- **FR-006**: الـ server MUST يرفض الإقلاع إذا كان أي من `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_ORIGINS` غير موجود في production
- **FR-007**: ملف `.env.example` MUST موجود في `artifacts/api-server/` مع شرح كل متغير
- **FR-008**: جميع الـ admin endpoints MUST محمية بـ rate limiting — حد أقصى 100 request/15min لكل IP — لمنع brute force على الـ login وعمليات admin مسروقة

### Key Entities

- **User**: مستخدم النظام — `id`, `email`, `full_name`, `role` (admin|manager|user), `permissions[]`, `is_active`
- **Role**: دور المستخدم — يحدد الصلاحيات والوصول للـ endpoints

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: جميع الـ admin endpoints ترفض 100% من الطلبات بدون توكن admin صحيح
- **SC-002**: CORS يمنع طلبات من domains غير مدرجة في production
- **SC-003**: مطوّر جديد يشغّل المشروع في أقل من 10 دقائق باتباع `.env.example`
- **SC-004**: `pnpm run typecheck` يعدي بصفر أخطاء بعد التغييرات
- **SC-005**: الـ server يرفض الإقلاع مع رسالة واضحة إذا كان متغير بيئة مطلوب غير موجود
- **SC-006**: عند تجاوز 100 طلب من IP واحد خلال 15 دقيقة، الـ admin endpoints ترجع 429 Too Many Requests

## Assumptions

- الـ admin الأول يُنشأ مباشرة من Supabase Dashboard أو سكريبت seed — لا واجهة لإنشائه
- بيئة development تستخدم `NODE_ENV=development` لتخفيف قيود CORS
- الـ `users` table موجودة في Supabase وفيها عمود `role` من نوع text
- لا يوجد حالياً نظام refresh tokens — JWT من Supabase مباشرة
