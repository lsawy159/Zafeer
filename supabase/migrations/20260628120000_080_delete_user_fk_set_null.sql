-- 080: تمهيد حذف المستخدم — تحويل FK الـ RESTRICT إلى SET NULL
-- DB-only | idempotent | لا يمس بيانات موجودة
-- الهدف: تمكين حذف صف public.users بدون انتهاك FK من extract_invoices وadhkar

-- =====================================================================
-- 1. extract_invoices.created_by: أسقط NOT NULL + غيّر ON DELETE إلى SET NULL
-- =====================================================================

-- 1a. اسقط NOT NULL (آمن idempotent: لا يفشل لو العمود nullable بالفعل)
ALTER TABLE public.extract_invoices
  ALTER COLUMN created_by DROP NOT NULL;

-- 1b. أسقط FK القديم (RESTRICT) وأعد إنشاءه بـ SET NULL
--     نستخدم DO block لأن اسم الـ constraint مولَّد تلقائياً
DO $$
DECLARE
  v_constraint text;
BEGIN
  SELECT tc.constraint_name
    INTO v_constraint
    FROM information_schema.table_constraints  tc
    JOIN information_schema.key_column_usage   kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema    = kcu.table_schema
   WHERE tc.constraint_type = 'FOREIGN KEY'
     AND tc.table_schema    = 'public'
     AND tc.table_name      = 'extract_invoices'
     AND kcu.column_name    = 'created_by'
   LIMIT 1;

  IF v_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.extract_invoices DROP CONSTRAINT %I', v_constraint);
  END IF;
END;
$$;

ALTER TABLE public.extract_invoices
  ADD CONSTRAINT extract_invoices_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- =====================================================================
-- 2. adhkar.created_by: غيّر ON DELETE إلى SET NULL (كان NO ACTION)
-- =====================================================================

DO $$
DECLARE
  v_constraint text;
BEGIN
  SELECT tc.constraint_name
    INTO v_constraint
    FROM information_schema.table_constraints  tc
    JOIN information_schema.key_column_usage   kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema    = kcu.table_schema
   WHERE tc.constraint_type = 'FOREIGN KEY'
     AND tc.table_schema    = 'public'
     AND tc.table_name      = 'adhkar'
     AND kcu.column_name    = 'created_by'
   LIMIT 1;

  IF v_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.adhkar DROP CONSTRAINT %I', v_constraint);
  END IF;
END;
$$;

ALTER TABLE public.adhkar
  ADD CONSTRAINT adhkar_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
