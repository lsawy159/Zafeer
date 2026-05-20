# برومبت ميزة المستخلصات — Zafeer Spec 014

```yaml
role: AI Engineering Assistant — speckit workflow

# ════════════════════════════════════════════════════════
# السياق العام
# ════════════════════════════════════════════════════════
context:
  project: "ZaFeer — منصة إدارة الأعمال (عربي RTL، عملة SAR، السوق الخليجي)"
  repo: "https://github.com/lsawy159/Zafeer"
  framework: "speckit (specify → plan → tasks → implement)"
  feature_name: "المستخلصات"
  feature_english_key: "extracts"
  feature_purpose: >
    إنشاء وإدارة وتصدير مستخلصات مالية شهرية للموظفين
    المعيّنين على مشاريع خارجية. كل مستخلص يحسب مستحقات
    الموظف بناءً على: سعر مهنته × أيام حضوره الفعلي.

# ════════════════════════════════════════════════════════
# التعليمات — مهم جداً اتباعها بالترتيب
# ════════════════════════════════════════════════════════
instructions:
  - "لا تبدأ التنفيذ فوراً — اتبع speckit بالترتيب الكامل."
  - "ابدأ بقراءة الملفات في قسم files_to_inspect أدناه."
  - "إذا وجدت غموضاً أو تعارضاً مع الكود الموجود، اسألني قبل التخطيط."
  - "جميع ردودك وتحليلاتك وأسئلتك باللغة العربية فقط."
  - "عند الشك في أي قرار، اعتمد الكود الموجود مرجعاً لا البرومبت."

# ════════════════════════════════════════════════════════
# الملفات التي يجب قراءتها قبل أي خطوة
# ════════════════════════════════════════════════════════
files_to_inspect:
  - "artifacts/zafeer/src/utils/PERMISSIONS_SCHEMA.ts"
  - "artifacts/zafeer/src/components/layout/nav-config.ts"
  - "artifacts/zafeer/src/App.tsx"
  - "artifacts/zafeer/src/lib/supabase.ts  # interface Project + interface Employee"
  - "artifacts/zafeer/src/hooks/useProjects.ts"
  - "artifacts/zafeer/src/components/projects/ProjectDetailModal.tsx"
  - "artifacts/zafeer/src/components/projects/ProjectCard.tsx"
  - "artifacts/zafeer/src/pages/PayrollDeductions.tsx  # مرجع للهيكل فقط"
  - "artifacts/zafeer/src/pages/payroll/  # مجلد sub-components كمرجع"
  - "artifacts/zafeer/src/utils/lazyXlsx.ts"
  - "lib/db/src/schema/projects.ts"
  - "lib/db/src/schema/employees.ts"
  - "supabase/migrations/  # آخر migration لمعرفة timestamp الصحيح"
  - "memory/PROJECT_CONTEXT.md"
  - "memory/DECISIONS.md"

# ════════════════════════════════════════════════════════
# Stack التقني
# ════════════════════════════════════════════════════════
tech_stack:
  frontend: "React 19.1 + TypeScript 5.9 + Vite 7.3"
  styling: "Tailwind CSS v4 (logical RTL properties) + shadcn/ui"
  data: "Supabase (PostgreSQL + RLS) + TanStack Query v5 (Supabase client مباشرة)"
  orm: "Drizzle ORM — lib/db/src/schema/"
  excel: "lazyXlsx.ts + file-saver saveAs — لا تضف مكتبات Excel جديدة"
  routing: "React Router DOM v6 — lazy imports في App.tsx"

# ════════════════════════════════════════════════════════
# حقائق الـ Schema الحالية (تحقق منها من الكود)
# ════════════════════════════════════════════════════════
existing_schema_facts:
  projects_table:
    current_columns: [id, name, description, status, created_at, updated_at]
    note: "لا company_id — المشاريع على مستوى النظام. لا تضف أي عمود جديد لهذا الجدول."

  employees_table:
    relevant_columns:
      - "id (UUID)"
      - "project_id (UUID FK nullable)"
      - "name (TEXT)"
      - "profession (TEXT nullable — نص حر، لا جدول lookup)"
      - "residence_number (BIGINT — مضمون الوجود لكل موظف)"
      - "salary (NUMERIC)"
      - "is_deleted (BOOLEAN)"
    residence_number_guarantee: >
      رقم الإقامة حقل إلزامي في واجهة إضافة الموظف (AddEmployeeModal.tsx).
      التحقق موجود في الكود: if (!formData.residence_number.trim()) return false.
      إذن كل موظف في قاعدة البيانات لديه رقم إقامة بالضرورة.
      لا حاجة لأي تحذير "موظف بلا رقم إقامة" — هذه الحالة مستحيلة.

  tables_to_create:
    - project_job_title_rates
    - extract_invoices
    - extract_invoice_lines

  latest_migration: "20260517221131_create_obligation_enums_and_tables.sql"
  new_migration_timestamp: "يجب أن يكون timestamp الـ migration بعد 20260517221131"

# ════════════════════════════════════════════════════════
# تغييرات قاعدة البيانات المطلوبة
# ════════════════════════════════════════════════════════
required_db_changes:

  # ── A: جدول أسعار المهن لكل مشروع ──────────────────
  A_project_job_title_rates:
    columns:
      - "id UUID PRIMARY KEY DEFAULT gen_random_uuid()"
      - "project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE"
      - "profession TEXT NOT NULL"
      - "cost_rate NUMERIC(12,2) NOT NULL"
      - "currency CHAR(3) NOT NULL DEFAULT 'SAR'"
      - "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
      - "updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
    constraints:
      - "UNIQUE(project_id, profession)  -- المطابقة دائماً بـ LOWER(TRIM(profession))"
    trigger: >
      أنشئ trigger يُحدّث updated_at تلقائياً عند كل UPDATE
      (نفس النمط المستخدم في جداول أخرى في المشروع)
    no_created_by: >
      لا تضف created_by — النظام إداري مركزي ولا نحتاج تتبع المنشئ
    rls:
      read: "user_has_permission('projects', 'view')"
      write: "user_has_permission('projects', 'edit')"

  # ── B: جدول رؤوس المستخلصات ─────────────────────────
  B_extract_invoices:
    columns:
      - "id UUID PRIMARY KEY DEFAULT gen_random_uuid()"
      - "project_id UUID NOT NULL REFERENCES public.projects(id)"
      - "invoice_month DATE NOT NULL  -- أول يوم الشهر دائماً، مثال: 2026-05-01"
      - "version SMALLINT NOT NULL DEFAULT 1  -- للإصدارات المتعددة"
      - "days_in_month SMALLINT NOT NULL"
      - "status TEXT NOT NULL DEFAULT 'draft'  -- draft | exported"
      - "employee_count INT  -- snapshot وقت الإنشاء"
      - "total_amount NUMERIC(12,2)  -- snapshot وقت الإنشاء"
      - "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
    constraints:
      - "UNIQUE(project_id, invoice_month, version)"
    no_created_by: "لا تضف created_by"
    versioning_rule: >
      عند إنشاء مستخلص لنفس (project_id + invoice_month) مرة ثانية:
        1. اقرأ MAX(version) للمجموعة الموجودة.
        2. أنشئ سجلاً جديداً بـ version = MAX+1.
        3. لا تحذف النسخ القديمة أبداً — تبقى للأرشيف.
      هذا القرار (v1, v2, ...) ينعكس على عمود version في الجدول.
    rls:
      read: "user_has_permission('extracts', 'view')"
      write: "user_has_permission('extracts', 'create')"

  # ── C: جدول تفاصيل سطور المستخلص ───────────────────
  C_extract_invoice_lines:
    columns:
      - "id UUID PRIMARY KEY DEFAULT gen_random_uuid()"
      - "invoice_id UUID NOT NULL REFERENCES public.extract_invoices(id) ON DELETE CASCADE"
      - "employee_id UUID NOT NULL REFERENCES public.employees(id)"
      - "profession_snapshot TEXT  -- قيمة profession وقت الإنشاء (لا تتغير)"
      - "residence_number_snapshot BIGINT  -- قيمة residence_number وقت الإنشاء"
      - "cost_rate_snapshot NUMERIC(12,2)  -- قيمة cost_rate وقت الإنشاء"
      - "daily_rate NUMERIC(12,4)  -- = cost_rate_snapshot / days_in_month"
      - "attendance_days NUMERIC(5,2)"
      - "amount_due NUMERIC(12,2)  -- = daily_rate × attendance_days"
    immutability_note: >
      جميع حقول _snapshot غير قابلة للتعديل بعد الإنشاء.
      هي صورة البيانات لحظة إنشاء المستخلص فقط.
    rls: "نفس صلاحيات extract_invoices"

# ════════════════════════════════════════════════════════
# نظام الصلاحيات
# ════════════════════════════════════════════════════════
permissions:
  file: "artifacts/zafeer/src/utils/PERMISSIONS_SCHEMA.ts"
  instruction: >
    أضف القسم التالي داخل PERMISSION_SECTIONS.
    المفتاح extracts (إنجليزي camelCase) متوافق مع نمط
    باقي الأقسام (transferProcedures، activityLogs، إلخ).
    الاسم العربي يُستخدم في الـ label فقط.
  code_to_add: |
    extracts: {
      label: 'المستخلصات',
      description: 'إدارة المستخلصات المالية الشهرية للمشاريع الخارجية.',
      actions: ['view', 'create', 'export'] as const,
    },

# ════════════════════════════════════════════════════════
# شريط التنقل (nav-config)
# ════════════════════════════════════════════════════════
navigation:
  file: "artifacts/zafeer/src/components/layout/nav-config.ts"
  instruction: >
    أضف بنداً جديداً في المجموعة operational.
    الفجوة في order موجودة فعلاً بين payroll-deductions (9)
    وimport-export (11) — استخدم 10.
    هذه صفحة مستقلة في الـ sidebar، ليست sub-item تحت أي صفحة.
  item_to_add:
    id: "extracts"
    labelAr: "المستخلصات"
    labelEn: "Extracts"
    icon: "FileText  # من lucide-react"
    to: "/extracts"
    requiredPermission: "extracts.view"
    group: "operational"
    order: 10

# ════════════════════════════════════════════════════════
# ميزة A — تحسين ProjectDetailModal (أسعار المهن)
# ════════════════════════════════════════════════════════
feature_A_job_title_rates:
  location: "ProjectDetailModal.tsx — أضف تبويباً جديداً اسمه 'أسعار المهن'"
  strict_rule: "لا تضف أي منطق CRUD أو API calls داخل ProjectCard.tsx"
  logic:
    - "جلب الموظفين المعيّنين على هذا المشروع (project_id = X، is_deleted = false)"
    - "استخراج قيم profession الفريدة — مقارنة دائماً بـ LOWER(TRIM(profession))"
    - "لكل مهنة: عرض اسمها + حقل إدخال cost_rate الشهري"
    - "حفظ / تحديث في project_job_title_rates"
    - "تحذير inline أحمر: إذا مهنة موجودة بلا cost_rate"
    - "تحذير inline أصفر: إذا موظف profession فارغة"

# ════════════════════════════════════════════════════════
# ميزة B — صفحة المستخلصات الرئيسية
# ════════════════════════════════════════════════════════
feature_B_extracts_page:
  main_file: "artifacts/zafeer/src/pages/Extracts.tsx"
  sub_components_folder: "artifacts/zafeer/src/pages/extracts/"
  hooks_file: "artifacts/zafeer/src/hooks/useExtracts.ts"
  drizzle_schema_file: "lib/db/src/schema/extracts.ts"

  structure_rule: >
    اتبع هيكل PayrollDeductions.tsx بالضبط:
    Page → Tabs → useState → Hooks → Sub-components
    Sub-components في مجلد pages/extracts/ (كما payroll/)

  list_view:
    description: "عرض كل المستخلصات"
    columns: ["اسم المشروع", "الشهر", "النسخة", "عدد الموظفين", "الإجمالي", "الحالة", "تاريخ الإنشاء"]
    actions_per_row: ["عرض التفاصيل", "تصدير Excel"]

  create_flow:
    step_1_select_project:
      label: "اختر المشروع"
      show: "اسم المشروع"
      block_if: "المشروع لا يحتوي أي موظف نشط → حالة فارغة، حظر الإنشاء"

    step_2_select_month:
      label: "اختر الشهر وأدخل عدد الأيام"
      fields:
        - "invoice_month (month picker — يُخزن كأول يوم الشهر)"
        - "days_in_month (رقم — عدد أيام الشهر الفعلية)"
      duplicate_check: >
        تحقق: هل يوجد مستخلص لنفس (project_id + invoice_month)؟
        إذا نعم → نبّه المستخدم:
        "يوجد نسخة سابقة (vN) لهذا المشروع والشهر.
         سيتم إنشاء نسخة جديدة (vN+1) بدون حذف القديمة."

    step_3_review_employees:
      label: "مراجعة الموظفين والأسعار"
      logic: "جلب موظفي المشروع + profession + cost_rate من project_job_title_rates"
      profession_matching: "LOWER(TRIM(profession)) في SQL وفي JavaScript"
      blocking_warnings:
        - "موظف profession فارغة: 'الموظف [اسم] بلا مسمى وظيفي'"
        - "مهنة بلا cost_rate في المشروع: 'المهنة [X] بلا سعر — أضفها من إعدادات المشروع'"
      note: >
        زر المتابعة مُعطَّل ما دام هناك أي تحذير.
        ملاحظة: لا حاجة لتحذير "بلا رقم إقامة" — رقم الإقامة
        إلزامي في واجهة إضافة الموظف، مضمون لكل موظف في النظام.

    step_4_attendance_upload:
      label: "رفع سجل الحضور"
      download_template:
        description: "قالب Excel مسبق التعبئة"
        columns: ["م", "اسم الموظف", "رقم الإقامة", "عدد الأيام"]
        note: "عمود عدد الأيام فارغ — يملأه المستخدم"
      upload:
        max_size: "20MB — تحقق على client قبل معالجة الملف"
        size_check_reason: >
          lazyXlsx.ts يحتوي تحذير ثغرة أمنية عند تحليل ملفات
          من المستخدم. حد الحجم يخفف هذه المخاطرة.
        matching_key: "residence_number (BIGINT — مطابقة تامة بلا تحويل)"
        warnings:
          - "رقم إقامة في الملف غير موجود في النظام: 'رقم [X] غير معروف'"
          - "attendance_days > days_in_month: 'أيام الحضور تتجاوز أيام الشهر للموظف [اسم]'"

    step_5_preview:
      label: "معاينة"
      table_columns: ["م", "اسم الموظف", "رقم الإقامة", "التكلفة الأساسية", "عدد أيام الحضور", "المستحق"]
      formula: "amount_due = (cost_rate / days_in_month) × attendance_days"
      export_button_rule: "مُعطَّل ما دام هناك أي تحذير غير محلول"

    step_6_export:
      label: "تصدير Excel"
      excel_columns: ["م", "اسم الموظف", "رقم الإقامة", "التكلفة الأساسية", "عدد أيام الحضور", "المستحق"]
      footer_row: ["إجمالي الموظفين", "إجمالي عدد أيام الحضور", "إجمالي التكلفة المستحقة"]
      library: "lazyXlsx.ts + saveAs — نفس النمط الموجود في المشروع تماماً"
      after_export: "حدّث status → 'exported' في extract_invoices"

# ════════════════════════════════════════════════════════
# قواعد عامة صارمة
# ════════════════════════════════════════════════════════
strict_rules:
  profession_matching:
    rule: "LOWER(TRIM(profession)) في كل مقارنة — SQL وJavaScript بدون استثناء"
    error_handling: "تحذير مرئي — ليس خطأ صامتاً يُتجاهل"

  snapshot_immutability:
    rule: "حقول _snapshot في extract_invoice_lines لا تُعدَّل بعد الإنشاء أبداً"

  rls_pattern:
    function: "user_has_permission(section TEXT, action TEXT)"
    admin_bypass: "admin role يحصل على true تلقائياً — لا تضف admin bypass يدوياً"
    users_reference: "REFERENCES public.users(id)  ← وليس auth.users(id)"

  do_not_touch:
    - "artifacts/zafeer/src/pages/PayrollDeductions.tsx"
    - "artifacts/zafeer/src/pages/payroll/*  (كل ملفات مجلد payroll)"
    - "أي migration ملف موجود — لا تعدّله"

# ════════════════════════════════════════════════════════
# الملفات المتوقع إنشاؤها
# ════════════════════════════════════════════════════════
files_to_create:
  - "supabase/migrations/YYYYMMDDHHMMSS_create_extracts_feature.sql"
  - "lib/db/src/schema/extracts.ts"
  - "artifacts/zafeer/src/pages/Extracts.tsx"
  - "artifacts/zafeer/src/pages/extracts/*.tsx  (sub-components)"
  - "artifacts/zafeer/src/hooks/useExtracts.ts"

files_to_modify:
  - "artifacts/zafeer/src/components/projects/ProjectDetailModal.tsx  → تبويب أسعار المهن فقط"
  - "artifacts/zafeer/src/utils/PERMISSIONS_SCHEMA.ts  → قسم extracts"
  - "artifacts/zafeer/src/components/layout/nav-config.ts  → بند المستخلصات"
  - "artifacts/zafeer/src/App.tsx  → lazy import + Route path='/extracts'"

# ════════════════════════════════════════════════════════
# الإخراج المتوقع
# ════════════════════════════════════════════════════════
output:
  language: "عربي فقط — جميع الردود والأسئلة والتحليلات"
  speckit_sequence: "specify → plan → tasks → implement"
  before_planning: >
    اقرأ الملفات المحددة أولاً.
    إذا وجدت أي تعارض بين هذا البرومبت والكود الفعلي،
    أخبرني واعتمد الكود مرجعاً.
```
