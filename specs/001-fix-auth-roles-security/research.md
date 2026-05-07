# Research: إصلاح نظام الأدوار والأمان

## 1. تشخيص الـ Role Bug

**Decision**: الـ bug ليس في منطق `auth.ts` — `requireAdmin` يتحقق من `role === "admin"` بشكل صحيح.
**المشكلة الحقيقية**: لا توجد آلية لإنشاء أول مستخدم بدور `admin`. `POST /api/admin/users` يُنشئ `manager` أو `user` فقط، والـ endpoint نفسه يتطلب admin للوصول إليه — دائرة مغلقة.
**Rationale**: Admin الأول يجب أن يُنشأ خارج الـ API (Supabase Dashboard أو seed script) — هذا بالتصميم وليس bug.
**Fix**: إنشاء seed script يُنشئ admin user + توثيق العملية في `.env.example` وREADME.

## 2. CORS Strategy

**Decision**: استخدام `ALLOWED_ORIGINS` env var — قائمة domains مفصولة بفاصلة.
**Rationale**: يتيح تهيئة مختلفة لكل environment (dev/staging/prod) بدون تغيير كود.
**Implementation**:
```ts
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) ?? []
app.use(cors({
  origin: process.env.NODE_ENV === 'development' ? true : allowedOrigins,
  credentials: true
}))
```
**Alternatives considered**: Hardcode domains في الكود — رُفض لأنه يتطلب redeploy لأي تغيير.

## 3. Zod Validation Strategy

**Decision**: إضافة Zod schemas مباشرة في كل route file — لا middleware مشترك.
**Rationale**: كل route لها schema مختلف، وإضافة middleware مشترك زيادة تعقيد غير مبررة.
**Pattern**:
```ts
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(1),
  role: z.enum(['manager', 'user']),
  permissions: z.array(z.string()).default([])
})
```

## 4. Env Validation at Startup

**Decision**: فحص env vars في `supabaseAdmin.ts` + إضافة فحص `ALLOWED_ORIGINS` في production.
**Rationale**: يوقف الـ server بلا ضجيج بدلاً من فشل غير متوقع عند أول request.
**Already done**: `SUPABASE_URL` و`SUPABASE_SERVICE_ROLE_KEY` محمية في `supabaseAdmin.ts`. نضيف `ALLOWED_ORIGINS` check في `app.ts`.

## 5. Seed Script للـ Admin الأول

**Decision**: PowerShell script يستخدم Supabase Admin API مباشرة لإنشاء أول admin.
**Rationale**: لا يحتاج الـ API server يشتغل — يُنفّذ مرة واحدة عند setup.
**Alternative**: تعليمات Supabase Dashboard — مقبولة لكن أبطأ وأكثر عرضة للخطأ.
