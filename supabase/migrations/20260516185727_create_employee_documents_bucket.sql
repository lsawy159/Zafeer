-- T002: Create employee-documents storage bucket + RLS policies
-- Bucket stores residence document files (image or PDF) per employee.
-- Field: employees.residence_image_url stores the storage object path.
-- user_has_permission() already handles admin=true internally.

-- Step 1: Create private bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-documents',
  'employee-documents',
  false,
  512000,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Step 2: RLS policies on storage.objects for bucket 'employee-documents'

CREATE POLICY "employee_docs_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'employee-documents'
    AND (SELECT user_has_permission('employees', 'view'))
  );

CREATE POLICY "employee_docs_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'employee-documents'
    AND (SELECT user_has_permission('employees', 'edit'))
  );

CREATE POLICY "employee_docs_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'employee-documents'
    AND (SELECT user_has_permission('employees', 'edit'))
  )
  WITH CHECK (
    bucket_id = 'employee-documents'
    AND (SELECT user_has_permission('employees', 'edit'))
  );

CREATE POLICY "employee_docs_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'employee-documents'
    AND (SELECT user_has_permission('employees', 'edit'))
  );
