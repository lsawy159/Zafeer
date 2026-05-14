# 🗄️ Backend — Supabase / SQL / API Routes

## Supabase — الإعداد الأساسي

```typescript
// lib/supabase/client.ts — للاستخدام في Client Components
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// lib/supabase/server.ts — للاستخدام في Server Components
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createServerSupabaseClient() {
  const cookieStore = cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value; },
        set(name, value, options) { cookieStore.set({ name, value, ...options }); },
        remove(name, options) { cookieStore.set({ name, value: '', ...options }); },
      },
    }
  );
}
```

## تصميم Schema قاعدة البيانات

```sql
-- ✅ مثال: نظام إدارة المشاريع
-- دائماً استخدم UUID كـ Primary Key
-- دائماً أضف created_at و updated_at
-- دائماً أضف Indexes على الأعمدة المُستعلَم عنها كثيراً

CREATE TABLE projects (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  status      TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  owner_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index للبحث السريع حسب المالك
CREATE INDEX projects_owner_idx ON projects(owner_id);

-- Trigger لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

## Row Level Security (RLS) — الأمان في القاعدة

```sql
-- تفعيل RLS — إلزامي لكل جدول يحتوي بيانات المستخدمين
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- المستخدم يرى مشاريعه فقط
CREATE POLICY "users_see_own_projects"
  ON projects FOR SELECT
  USING (auth.uid() = owner_id);

-- المستخدم يضيف مشاريع باسمه فقط
CREATE POLICY "users_insert_own_projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- المستخدم يعدل مشاريعه فقط
CREATE POLICY "users_update_own_projects"
  ON projects FOR UPDATE
  USING (auth.uid() = owner_id);

-- المستخدم يحذف مشاريعه فقط
CREATE POLICY "users_delete_own_projects"
  ON projects FOR DELETE
  USING (auth.uid() = owner_id);
```

## استعلامات Supabase المتقدمة

```typescript
// جلب مع علاقات (JOIN)
const { data: projects } = await supabase
  .from('projects')
  .select(`
    id,
    name,
    status,
    tasks (
      id,
      title,
      completed
    ),
    owner:users (
      name,
      email
    )
  `)
  .eq('status', 'active')
  .order('created_at', { ascending: false })
  .limit(10);

// بحث نصي
const { data } = await supabase
  .from('projects')
  .select('*')
  .ilike('name', `%${searchQuery}%`); // بحث غير حساس لحالة الأحرف

// إضافة أو تحديث (Upsert)
const { data, error } = await supabase
  .from('settings')
  .upsert({
    user_id: userId,
    theme: 'dark',
    language: 'ar',
  }, {
    onConflict: 'user_id', // إذا كان السجل موجود، حدّثه
  });

// Realtime Subscriptions
const channel = supabase
  .channel('projects-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'projects',
    filter: `owner_id=eq.${userId}`,
  }, (payload) => {
    console.log('تغيير جديد:', payload);
    // حدّث الـ UI هنا
  })
  .subscribe();
```

## Next.js API Routes

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Schema التحقق من المدخلات
const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  role: z.enum(['admin', 'user']).default('user'),
});

// GET /api/users
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // التحقق من تسجيل الدخول
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }
    
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: 'خطأ في السيرفر' },
      { status: 500 }
    );
  }
}

// POST /api/users
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // التحقق من صحة البيانات
    const validated = createUserSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.errors },
        { status: 400 }
      );
    }
    
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .insert(validated.data)
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'خطأ في السيرفر' }, { status: 500 });
  }
}
```

## متغيرات البيئة — النمط الصحيح

```bash
# .env.local — لا يُرفع على GitHub أبداً
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # سري جداً — للسيرفر فقط

# .env.example — يُرفع على GitHub كمرجع
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## SQL المتقدم — للاستعلامات المعقدة

```sql
-- CTE (Common Table Expression) — لاستعلامات مقروءة
WITH monthly_stats AS (
  SELECT
    DATE_TRUNC('month', created_at) AS month,
    COUNT(*) AS total_projects,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed
  FROM projects
  WHERE owner_id = auth.uid()
  GROUP BY 1
)
SELECT
  month,
  total_projects,
  completed,
  ROUND(completed::numeric / total_projects * 100, 1) AS completion_rate
FROM monthly_stats
ORDER BY month DESC;

-- Window Functions — لترتيب وتحليل متقدم
SELECT
  name,
  status,
  created_at,
  ROW_NUMBER() OVER (PARTITION BY status ORDER BY created_at DESC) AS rank_in_status,
  COUNT(*) OVER () AS total_count
FROM projects
WHERE owner_id = auth.uid();
```
