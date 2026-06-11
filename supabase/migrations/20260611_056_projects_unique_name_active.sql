-- منع تكرار اسم المشروع للمشاريع النشطة فقط
-- المشاريع المحذوفة (deleted_at IS NOT NULL) مستثناة من القيد
CREATE UNIQUE INDEX IF NOT EXISTS projects_name_unique_active
ON projects(name) WHERE deleted_at IS NULL;
