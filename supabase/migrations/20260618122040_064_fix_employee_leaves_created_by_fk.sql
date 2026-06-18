-- 064: إصلاح FK لـ created_by — ON DELETE SET NULL بدل NO ACTION
ALTER TABLE public.employee_leaves
  DROP CONSTRAINT IF EXISTS employee_leaves_created_by_fkey;

ALTER TABLE public.employee_leaves
  ADD CONSTRAINT employee_leaves_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
