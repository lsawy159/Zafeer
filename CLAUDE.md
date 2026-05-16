<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
specs/006-user-management/plan.md
<!-- SPECKIT END -->

<!-- MEMORY SYSTEM START -->
## نظام الذاكرة المحلي (memory/) — مرجع لأي مساعد ذكي

هذا المشروع يستخدم نظام ذاكرة محلي محايد ومستقل عن أي مساعد بعينه.
المجلد `memory/` في جذر المشروع هو **مصدر السياق المُعتمد** لأي AI assistant
(Claude, ChatGPT, Cursor, Copilot, Codex, Gemini, ...) يعمل على هذا الـ repo.

### القواعد الإلزامية لأي مساعد

1. **أول كل جلسة عمل**: اقرأ ملفات `memory/*.md` بالترتيب:
   - `memory/PROJECT_CONTEXT.md` → حالة المشروع، البنية، ما تم وما بقي.
   - `memory/DECISIONS.md` → القرارات التقنية المعتمدة + أسبابها.
   - `memory/HISTORY.md` → سجل الجلسات (الأحدث أعلى).
   - `memory/CODE_SNIPPETS.md` → مقاطع شيفرة حرجة لفهم النظام.

2. **بعد كل جلسة عمل**: لخّص ما حدث وحدّث الملفات تلقائياً:
   - أضف نقطة جديدة في أعلى `memory/HISTORY.md` بتاريخ اليوم.
   - حدّث `memory/PROJECT_CONTEXT.md` (قسم "ما تم"، "ما بقي"، "Known Issues").
   - عند اتخاذ قرار تقني جديد → سجّله في `memory/DECISIONS.md` بصيغة `D-NNN`.
   - عند ظهور نمط برمجي حرج → أضفه إلى `memory/CODE_SNIPPETS.md`.

3. **المحتوى عالي الكثافة**:
   - نقاط، لا فقرات.
   - بدون حشو لغوي.
   - بدون حذف لأي قرار أو سياق مهم.

4. **الأمان (إلزامي)**:
   - **ممنوع منعاً باتاً** كتابة أسرار / API keys / Supabase service_role / كلمات مرور / tokens
     في أي ملف داخل `memory/` أو في `CLAUDE.local.md`.
   - استخدم placeholders (`<anon-key>`, `<service-role>`) بدلاً من القيم الفعلية.
   - الأسرار الحقيقية تبقى فقط في `.env` المحلي (مستثنى أصلاً من git).

5. **`memory/` غير مرفوع على GitHub** — راجع `.gitignore`. هذا متعمَّد:
   - الذاكرة شخصية لكل بيئة عمل.
   - لا تتسبب في تعارضات merge.
   - تسمح بحرية تسجيل سياق دون قلق.

6. **عند تعارض الذاكرة مع الكود الفعلي**: ثق بالكود الحالي وحدّث الذاكرة.
   الذاكرة لقطة في زمن — قد تتقادم.

7. **قبل كتابة أي حقيقة في `memory/`**: تحقق منها من الكود/الملفات الفعلية،
   لا تنسخ من memory قديمة (داخلية للمساعد) ولا من حدس عام. الحقائق الحرجة
   التي **يجب** التحقق منها كل مرة:
   - السوق المستهدف والعملة (راجع `useEmployeeObligations.ts`, `usePayroll.ts`).
   - عدد/أسماء صفحات الـ sidebar (راجع `components/layout/nav-config.ts`).
   - عناوين/وصف التطبيق (راجع `index.html`).
   - بنية الجداول (راجع `lib/db` + `supabase/migrations/`).

<!-- MEMORY SYSTEM END -->
