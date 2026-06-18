-- 064: جدول إجازات الموظفين
CREATE TABLE IF NOT EXISTS public.employee_leaves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  notes text,
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT employee_leaves_dates_check CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS employee_leaves_employee_id_idx ON public.employee_leaves(employee_id);
CREATE INDEX IF NOT EXISTS employee_leaves_start_date_idx ON public.employee_leaves(start_date);

ALTER TABLE public.employee_leaves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employee_leaves_read"
  ON public.employee_leaves FOR SELECT TO authenticated
  USING ((SELECT user_has_permission('employeeLeaves', 'view')));

CREATE POLICY "employee_leaves_insert"
  ON public.employee_leaves FOR INSERT TO authenticated
  WITH CHECK ((SELECT user_has_permission('employeeLeaves', 'create')));

CREATE POLICY "employee_leaves_update"
  ON public.employee_leaves FOR UPDATE TO authenticated
  USING ((SELECT user_has_permission('employeeLeaves', 'edit')))
  WITH CHECK ((SELECT user_has_permission('employeeLeaves', 'edit')));

CREATE POLICY "employee_leaves_delete"
  ON public.employee_leaves FOR DELETE TO authenticated
  USING ((SELECT user_has_permission('employeeLeaves', 'delete')));
