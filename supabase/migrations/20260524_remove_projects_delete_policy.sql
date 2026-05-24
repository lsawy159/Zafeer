-- Remove RLS DELETE policy from projects
-- Soft delete must only happen via Admin API (/admin/projects/{id})
-- Frontend cannot make direct DELETE calls

DROP POLICY IF EXISTS "projects_delete" ON public.projects;

-- Note: extract_invoices has ON DELETE RESTRICT constraint
-- This is correct - prevents hard deletes, forces soft delete via API
