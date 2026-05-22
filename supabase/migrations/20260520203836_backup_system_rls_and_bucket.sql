-- إنشاء bucket النسخ الاحتياطية + إصلاح RLS على backup_history
-- العمليات:
--   1) bucket 'backups' (private) — الرفع يتم فقط عبر Edge Function بـ service_role
--   2) RLS على storage.objects للسماح للأدمن بإنشاء Signed URLs للتحميل
--   3) RLS على backup_history للسماح للأدمن بقراءة سجل النسخ

-- ─── 1. Storage bucket ───────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'backups',
  'backups',
  false,
  null,                                    -- لا حد للحجم (ملفات قد تكبر)
  ARRAY['application/gzip', 'application/json', 'application/octet-stream']
)
ON CONFLICT (id) DO UPDATE SET
  public            = EXCLUDED.public,
  file_size_limit   = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ─── 2. Storage RLS — Admin SELECT فقط (لإنشاء Signed URLs) ─────────────────
DROP POLICY IF EXISTS "backups_admin_select" ON storage.objects;
CREATE POLICY "backups_admin_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'backups' AND (SELECT public.is_admin()));

-- service_role يتجاوز RLS تلقائياً → لا نحتاج INSERT/UPDATE/DELETE policy

-- ─── 3. backup_history RLS — Admin SELECT ────────────────────────────────────
ALTER TABLE public.backup_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_select_backup_history" ON public.backup_history;
CREATE POLICY "admins_select_backup_history"
  ON public.backup_history
  FOR SELECT
  TO authenticated
  USING (public.is_admin());
