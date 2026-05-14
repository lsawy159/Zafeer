# 🖥️ Frontend — React / Next.js / TypeScript

## Next.js App Router — الهيكل الصحيح

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx          ← Layout مشترك للـ Dashboard
│   │   ├── page.tsx            ← الصفحة الرئيسية
│   │   └── [id]/page.tsx       ← صفحات ديناميكية
│   ├── api/
│   │   └── [endpoint]/route.ts ← API Routes
│   ├── layout.tsx              ← Root Layout
│   └── globals.css
├── components/
│   ├── ui/                     ← مكونات Shadcn الأساسية
│   └── features/               ← مكونات وظيفية للمشروع
├── lib/
│   ├── supabase/
│   │   ├── client.ts           ← Client-side Supabase
│   │   └── server.ts           ← Server-side Supabase
│   └── utils.ts
├── hooks/                      ← Custom React Hooks
├── types/                      ← TypeScript interfaces & types
└── store/                      ← Zustand stores
```

## Server vs Client Components — متى تستخدم كل منهما؟

```typescript
// Server Component (افتراضي في App Router)
// ✅ استخدمه لـ: جلب البيانات، SEO، صفحات ثابتة
// ❌ لا يدعم: useState, useEffect, event handlers

// app/users/page.tsx
export default async function UsersPage() {
  // جلب البيانات مباشرة من السيرفر — أسرع وأكثر أماناً
  const users = await getUsers();
  
  return (
    <div>
      {users.map(user => <UserCard key={user.id} user={user} />)}
    </div>
  );
}
```

```typescript
// Client Component
// ✅ استخدمه لـ: تفاعل المستخدم، useState, useEffect
// "use client" في أول السطر — إلزامي

'use client';

import { useState } from 'react';

export function SearchBox({ onSearch }: { onSearch: (q: string) => void }) {
  const [query, setQuery] = useState('');
  
  return (
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && onSearch(query)}
      placeholder="ابحث..."
      className="input"
    />
  );
}
```

## TypeScript — الأنماط الأساسية

```typescript
// تعريف Types للمشروع — ضعها في src/types/
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  created_at: string;
}

// Generic Response Type
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

// Props للمكونات
interface UserCardProps {
  user: User;
  onEdit?: (id: string) => void;
  className?: string;
}
```

## React Query — إدارة البيانات من السيرفر

```typescript
// hooks/useUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // البيانات صالحة 5 دقائق
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      // أعد جلب قائمة المستخدمين بعد الحذف
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
```

## Zustand — إدارة الـ State البسيطة

```typescript
// store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    {
      name: 'auth-storage', // اسم الـ key في localStorage
    }
  )
);
```

## React Hook Form + Zod — النماذج الآمنة

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// تعريف Schema التحقق
const loginSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صحيح'),
  password: z.string().min(8, 'كلمة المرور 8 أحرف على الأقل'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    // البيانات هنا مضمونة صحيحة بعد التحقق
    await signIn(data.email, data.password);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} placeholder="البريد الإلكتروني" />
      {errors.email && <span className="text-red-500">{errors.email.message}</span>}
      
      <input {...register('password')} type="password" placeholder="كلمة المرور" />
      {errors.password && <span className="text-red-500">{errors.password.message}</span>}
      
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'جاري تسجيل الدخول...' : 'دخول'}
      </button>
    </form>
  );
}
```

## Loading & Error States — لا تنسها أبداً

```typescript
// كل مكون يجلب بيانات يجب أن يعالج هذه الحالات الثلاث
export function UserList() {
  const { data: users, isLoading, error } = useUsers();

  // حالة التحميل
  if (isLoading) return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />
      ))}
    </div>
  );

  // حالة الخطأ
  if (error) return (
    <div className="text-center py-8 text-red-500">
      <p>حدث خطأ في جلب البيانات</p>
      <button onClick={() => window.location.reload()}>إعادة المحاولة</button>
    </div>
  );

  // حالة البيانات الفارغة
  if (!users?.length) return (
    <div className="text-center py-8 text-gray-400">
      لا يوجد مستخدمون بعد
    </div>
  );

  // الحالة الطبيعية
  return (
    <ul>
      {users.map(user => <UserCard key={user.id} user={user} />)}
    </ul>
  );
}
```
