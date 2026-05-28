-- 039e: إضافة ON DELETE CASCADE على FK الخاصة بـ header_id في obligation_lines
-- يتيح حذف الالتزام المسدد بالكامل بأمر DELETE واحد على الـ header
ALTER TABLE employee_obligation_lines
  DROP CONSTRAINT IF EXISTS employee_obligation_lines_header_id_fkey;

ALTER TABLE employee_obligation_lines
  ADD CONSTRAINT employee_obligation_lines_header_id_fkey
    FOREIGN KEY (header_id)
    REFERENCES employee_obligation_headers(id)
    ON DELETE CASCADE;
