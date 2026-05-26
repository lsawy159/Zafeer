-- Allow admins to delete activity log entries
CREATE POLICY "activity_log_delete"
ON public.activity_log
FOR DELETE
TO authenticated
USING (is_admin());
