-- 069: ملفات مستندات إضافية للموظف (الشهادة الصحية + عقد الأجير)
-- مرفقات مستندية فقط — لا تُستخدم لاستخراج صورة/أفاتار للموظف.
-- تُخزَّن في نفس bucket: employee-documents (سياسات RLS الحالية تغطيها — لا حاجة لسياسات جديدة).
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS health_certificate_url TEXT,
  ADD COLUMN IF NOT EXISTS ajeer_contract_url TEXT;
