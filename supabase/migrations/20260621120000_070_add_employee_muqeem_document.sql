-- 070: وثيقة مقيم — مرفق مستندي إضافي للموظف
-- مرفق مستندي فقط — لا يُستخدم لاستخراج صورة/أفاتار للموظف.
-- يُخزَّن في نفس bucket: employee-documents (سياسات RLS الحالية تغطيه — لا حاجة لسياسة جديدة).
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS muqeem_document_url TEXT;
