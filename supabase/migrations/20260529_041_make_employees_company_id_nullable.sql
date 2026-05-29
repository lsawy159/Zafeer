-- Allow employees to exist without a company (e.g. when company is deleted)
ALTER TABLE employees ALTER COLUMN company_id DROP NOT NULL;
