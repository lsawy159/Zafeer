-- إضافة حقل الصورة المقتطعة (thumbnail) للموظف من صورة الإقامة
-- الحقل الأصلي residence_image_url يحتفظ بالملف الكامل
-- هذا الحقل يحتفظ فقط بالجزء المقتطع لعرضه كصورة الموظف في الكارت
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS residence_thumbnail_url TEXT;
