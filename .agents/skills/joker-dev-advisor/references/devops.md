# 🚀 DevOps — Vercel / GitHub / CI/CD

## إعداد مشروع جديد من الصفر

### الخطوة 1 — إنشاء المشروع محلياً
```bash
# إنشاء مشروع Next.js مع كل الإعدادات المثالية
npx create-next-app@latest my-project \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*"

cd my-project
```

### الخطوة 2 — إعداد Git
```bash
# تهيئة Git (يكون موجود عادة مع create-next-app)
git init
git add .
git commit -m "init: مشروع Next.js جديد"

# ربط بـ GitHub
git remote add origin https://github.com/username/my-project.git
git branch -M main
git push -u origin main
```

### الخطوة 3 — .gitignore الصحيح
```gitignore
# متغيرات البيئة — أهم حاجة تُخفيها
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Next.js
.next/
out/
build/

# Node.js
node_modules/

# Logs
*.log
npm-debug.log*

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
```

### الخطوة 4 — النشر على Vercel
```bash
# تثبيت Vercel CLI
npm i -g vercel

# النشر الأول (يطلب تسجيل الدخول)
vercel

# بعد ذلك النشر للـ Production
vercel --prod
```

---

## استراتيجية الـ Branches

```
main          ← الإنتاج — لا تُعدّل مباشرة أبداً
develop       ← التطوير — تدمج فيه الـ Features
feature/xxx   ← ميزة جديدة
fix/xxx       ← إصلاح مشكلة
hotfix/xxx    ← إصلاح طارئ للإنتاج
```

```bash
# إنشاء Feature جديدة
git checkout develop
git pull origin develop
git checkout -b feature/user-authentication

# بعد الانتهاء
git add .
git commit -m "feat: إضافة نظام تسجيل الدخول"
git push origin feature/user-authentication
# ثم افتح Pull Request على GitHub
```

---

## GitHub Actions — CI/CD الأوتوماتيكي

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: إعداد Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: تثبيت الحزم
        run: npm ci
      
      - name: فحص TypeScript
        run: npm run type-check
      
      - name: فحص الكود (Lint)
        run: npm run lint
      
      - name: بناء المشروع
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

---

## Environment Variables — إدارة البيئات

### محلي (.env.local)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Vercel (للنشر)
```bash
# إضافة عبر CLI
vercel env add NEXT_PUBLIC_SUPABASE_URL

# أو عبر لوحة Vercel: Project → Settings → Environment Variables
# مهم: اختر البيئات الصحيحة (Production / Preview / Development)
```

### GitHub Secrets (للـ CI/CD)
```
GitHub Repository → Settings → Secrets and variables → Actions
```

---

## Vercel — إعداد متقدم

```json
// vercel.json
{
  "regions": ["iad1"],   // اختر المنطقة الأقرب لجمهورك
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ],
  "crons": [
    {
      "path": "/api/cron/daily-report",
      "schedule": "0 8 * * *"  // كل يوم الساعة 8 صباحاً
    }
  ]
}
```

---

## Checklist النشر — قبل كل Deploy

```
[ ] git pull وتأكد أنك على الـ branch الصحيح
[ ] npm run build يعمل بدون أخطاء محلياً
[ ] جميع Environment Variables مضافة على Vercel
[ ] RLS مفعّل على جميع جداول Supabase
[ ] .env.local في .gitignore
[ ] لا توجد console.log في الكود (أو ستُزال)
[ ] اختبر على الجوال قبل النشر
[ ] عمل git commit بوصف واضح
```
