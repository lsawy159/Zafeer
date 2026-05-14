# Phase 0 — Research

قرارات فنية لتنفيذ rename بدون كسر النظام.

---

## R1 — استراتيجية folder rename

**Decision**: `git mv artifacts/sawtracker artifacts/zafeer`.

**Rationale**:
- يحفظ blame/log history لكل ملف.
- atomic operation في working tree.
- Git يكتشف الـ rename (similarity 100%) → diff نظيف.

**Alternatives**:
- `cp -r` + `rm -rf` + `git add/rm`: مرفوض — يفقد history، diff ضخم بـ 200+ "deleted/added".
- إبقاء المجلد واسم workspace package فقط: مرفوض — انتهاك Constitution VI، يبقي اسم قديم في المسار.

---

## R2 — ترتيب الـ phases

**Decision**: A → C → B → E.

**Rationale**:
- **A (UI/Storage)** آمن، MVP، يُنشر فوراً للمستخدم بدون انتظار B.
- **C (Active docs)** آمن، يمكن دفعه قبل B (لأن المسارات الـجديدة في docs تكون "future-truth"؛ لكن أفضل يكون بعد B عملياً).
- **B (Folder + Package)** أخطر، atomic، يحتاج كل configs تُحدَّث معاً + lockfile regen.
- **E (Vercel dashboard)** يدوي، خارج الكود.

**عمليّاً**: 
1. Phase A → commit + push + Vercel preview (تحقق UI).
2. Phase B → commit واحد ضخم atomic (folder + package + 9 configs + lockfile) → preview.
3. Phase C → docs.
4. Phase E → بعد merge على main + استقرار يومين، rename Vercel project.

**Alternatives**:
- B قبل A: مرفوض — يخلط حساسية عالية مع تغيير أصغر.
- كل شيء في PR واحد: مرفوض — صعب review، rollback غير ممكن لجزء.

---

## R3 — localStorage migration timing

**Decision**: eager once-per-load في top-level module بعد import.

**Code pattern**:
```ts
// useUiPreferences.ts (top level)
const LEGACY_THEME = 'sawtracker-theme-mode'
const NEW_THEME    = 'zafeer-theme-mode'
const LEGACY_FONT  = 'sawtracker-font-mode'
const NEW_FONT     = 'zafeer-font-mode'

function migrateLegacyKey(legacy: string, current: string) {
  if (typeof window === 'undefined') return
  try {
    const v = window.localStorage.getItem(legacy)
    if (v !== null) {
      if (window.localStorage.getItem(current) === null) {
        window.localStorage.setItem(current, v)
      }
      window.localStorage.removeItem(legacy)
    }
  } catch { /* private mode أو SecurityError */ }
}

migrateLegacyKey(LEGACY_THEME, NEW_THEME)
migrateLegacyKey(LEGACY_FONT, NEW_FONT)
```

**Rationale**:
- يعمل قبل أي قراءة من الـ hook.
- idempotent (لو تنفّذ مرتين، الـ legacy مش موجود = no-op).
- لا يحجب الـ render (synchronous + سريع).

**Alternatives**:
- Lazy migration عند أول قراءة: مرفوض — يضيف فرع منطقي في كل callsite.
- Migration في `main.tsx`: مرفوض — يربط الـ logic بمكان بعيد عن الـ owner.
- Service Worker: مرفوض — overkill.

---

## R4 — Legacy fallback في logger

**Decision**: استبدال مباشر بدون fallback (debug flag، استخدام محدود).

**Rationale**:
- المفتاح يستخدمه المطوّرون فقط (debug logs).
- إعادة تفعيل debug في console = ثانية واحدة.
- backward compat لـ debug flag = noise في الكود.

**Alternatives**:
- fallback لـ legacy 30 يوم: مرفوض هنا — حالة بسيطة.

---

## R5 — `pnpm-lock.yaml` بعد package rename

**Decision**: حذف `node_modules/` + `pnpm-lock.yaml` ثم `pnpm install` لتوليد lockfile جديد.

**Rationale**:
- pnpm يربط workspace package name داخل lockfile (سطر 355 + كل `link:` references).
- diff manual خطر (سهل نسيان موضع).
- regen يضمن atomic + correct.

**Validation**: بعد install:
- `pnpm typecheck` ينجح.
- `pnpm --filter @workspace/zafeer run build` ينجح.
- `git diff pnpm-lock.yaml` يُظهر فقط التغييرات المتعلقة بالـ rename (لا dependency upgrades مفاجئة).

**Alternatives**:
- `sed` على lockfile: مرفوض — هش.
- `pnpm install --lockfile-only`: مقبول كبديل، لكن full install أوضح للتحقق.

---

## R6 — Archived specs disclaimer

**Decision**: ملف جديد `specs/INDEX.md` واحد + سطر disclaimer في رأسه. لا تعديل على ملفات أرشيفية.

**Rationale**:
- Constitution VI.7 يحظر تعديل archived specs.
- Disclaimer واحد كافٍ لتوجيه القارئ.
- لو لاحقاً نريد scriptable check → grep على `specs/00{1,2}-*` يُستثنى عمداً.

**Pattern**:
```md
# Specs Index

> **ملاحظة**: ملفات specs السابقة (001، 002) قد تشير للاسم القديم `sawtracker` كأرشيف
> تاريخي. الاسم المعتمد للمشروع الحالي هو `ZaFeer`. راجع spec 003 للـ rename.

- [001-fix-auth-roles-security](001-fix-auth-roles-security/) — مكتمل + merged
- [002-zafeer-design-migration](002-zafeer-design-migration/) — تصميم ZaFeer
- [003-rename-sawtracker-to-zafeer](003-rename-sawtracker-to-zafeer/) — rename الحالي
```

---

## R7 — التحقق من DB قبل البدء

**Decision**: تشغيل `grep -ri sawtracker supabase/ lib/db/` كـ pre-flight check.

**Result (محدَّث 2026-05-14)**: 0 hits ✅. Constitution VI.6 (DB rename يحتاج migration) لا ينطبق.

**Rationale**: rename DB identifier يحتاج Drizzle migration + احتمال backward-compat view. التحقق المسبق يثبت أن هذا ليس مطلوباً.

---

## R8 — Worktrees المؤقتة

**Decision**: تجاهل تام لـ `.claude/worktrees/*/artifacts/sawtracker/`.

**Rationale**:
- worktrees معزولة، تنتهي تلقائياً.
- مدرجة بالفعل في `.gitignore` كمسار `.claude/worktrees/`.
- محاولة rename داخلها = خطأ (worktree branch منفصل).

---

## R9 — Vercel project rename impact

**Decision**: rename Vercel project name بعد merge + استقرار 2 يوم. الاحتفاظ بـ domain alias قديم 30 يوم.

**Rationale**:
- Vercel rename يبدّل preview URL pattern من `sawtracker-*.vercel.app` إلى `zafeer-*.vercel.app`.
- bookmarks المطوّرين تنكسر بدون alias.
- production domain (لو على custom domain) لا يتأثر.

**Action items للمالك**:
1. Settings → General → Project Name → `zafeer`
2. Settings → Domains → تأكد custom domain موجود
3. لو preview URL القديم محفوظ → اتركه alias 30 يوم

---

## R10 — `.replit-artifact/` future

**Decision**: تحديث `title` + `id` + filter strings للاتساق، لكن عدم استثمار وقت إضافي. المالك أوضح أن الإنتاج Vercel.

**Rationale**:
- لو Replit ما زال يُستخدم للـ playground → تحديث ضروري للحفاظ على البناء.
- لو لا → الملف يبقى تاريخياً، تحديث الـ title يكفي.

**Conservative**: تحديث الكل (`title`، `id`، `publicDir`، 3 مواضع filter) في Phase B لأنه يقع داخل المجلد الذي سيُعاد تسميته.
