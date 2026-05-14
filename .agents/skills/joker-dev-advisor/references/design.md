# 🎨 UI/UX — التصميم المحترف

## مبادئ التصميم الأساسية

### 1. التسلسل البصري (Visual Hierarchy)
- العنصر الأهم يكون **أكبر وأسمك وأعلى**
- المستخدم يقرأ من الأعلى اليمين للأسفل اليسار (في RTL)
- اللون يجذب الانتباه — استخدمه بحكمة

### 2. المسافات (Spacing)
- استخدم نظام Tailwind: `space-y-4`, `gap-6`, `p-4` باستمرار
- لا تخلط قيم عشوائية — التزم بالـ grid (4px, 8px, 12px, 16px, 24px, 32px...)
- المساحة البيضاء ليست فراغاً — هي تصميم

### 3. اللون والتباين
- نسبة التباين بين النص والخلفية: 4.5:1 على الأقل (معيار Accessibility)
- لا تعتمد على اللون وحده لنقل المعلومات
- Dark Mode من البداية باستخدام CSS Variables

### 4. الخطوط (Typography)
- للعربية: **Cairo** أو **Tajawal** أو **IBM Plex Arabic**
- للإنجليزية: **Inter** أو **Geist**
- التسلسل: h1 > h2 > h3 > body > caption
- لا تستخدم أكثر من خطين في المشروع الواحد

---

## نظام الألوان — CSS Variables

```css
/* globals.css */
:root {
  /* الألوان الأساسية */
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  
  /* الألوان الرئيسية للمشروع */
  --primary: 221 83% 53%;        /* أزرق */
  --primary-foreground: 0 0% 100%;
  
  --secondary: 210 40% 96%;
  --secondary-foreground: 222 47% 11%;
  
  /* حالات التنبيه */
  --success: 142 76% 36%;
  --warning: 38 92% 50%;
  --destructive: 0 84% 60%;
  
  /* الحدود والخلفيات */
  --border: 214 32% 91%;
  --muted: 210 40% 96%;
  --muted-foreground: 215 16% 47%;
  
  /* الشعاع */
  --radius: 0.5rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 217 91% 60%;
  --border: 217 33% 17%;
  /* ... باقي القيم */
}
```

---

## مكونات Tailwind الجاهزة

### بطاقة (Card) احترافية
```tsx
function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="
      group relative overflow-hidden
      rounded-xl border border-border
      bg-card p-6
      shadow-sm hover:shadow-md
      transition-all duration-200
      hover:-translate-y-0.5
    ">
      {/* شريط الحالة العلوي */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1",
        project.status === 'active' && "bg-green-500",
        project.status === 'paused' && "bg-yellow-500",
        project.status === 'completed' && "bg-blue-500",
      )} />
      
      <h3 className="font-semibold text-lg text-foreground mb-2">
        {project.name}
      </h3>
      
      <p className="text-sm text-muted-foreground line-clamp-2">
        {project.description}
      </p>
      
      <div className="mt-4 flex items-center justify-between">
        <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
          {project.status}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {formatDate(project.created_at)}
        </span>
      </div>
    </div>
  );
}
```

### زر مع Loading State
```tsx
function SubmitButton({ 
  children, 
  isLoading,
  ...props 
}: ButtonProps & { isLoading?: boolean }) {
  return (
    <Button disabled={isLoading} {...props}>
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          جاري المعالجة...
        </>
      ) : children}
    </Button>
  );
}
```

### Modal / Dialog
```tsx
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  isLoading?: boolean;
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, description, isLoading
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground">{description}</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : 'تأكيد'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Framer Motion — الأنيميشن الاحترافي

```tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';

// أنيميشن الدخول للقوائم
export function AnimatedList({ items }: { items: any[] }) {
  return (
    <motion.ul
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.05 } },
      }}
    >
      {items.map((item, i) => (
        <motion.li
          key={item.id}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.3 }}
        >
          {/* محتوى العنصر */}
        </motion.li>
      ))}
    </motion.ul>
  );
}

// أنيميشن ظهور/اختفاء (مثال: Toast أو Notification)
export function Notification({ show, message }: { show: boolean; message: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

## RTL — دعم العربية

```tsx
// layout.tsx — إعداد اتجاه العربية
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="font-cairo antialiased">
        {children}
      </body>
    </html>
  );
}
```

```css
/* tailwind.config.ts — إضافة خط Cairo */
theme: {
  extend: {
    fontFamily: {
      cairo: ['Cairo', 'sans-serif'],
    }
  }
}
```

```html
<!-- في الـ head أو layout -->
<link
  href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

---

## قائمة التحقق من التصميم — قبل التسليم

```
[ ] الألوان متسقة عبر كل الصفحات (CSS Variables)
[ ] Dark Mode يعمل بشكل صحيح
[ ] Responsive: يعمل على جوال (375px) ولابتوب (1440px)
[ ] RTL: كل النصوص والأيقونات في اتجاه صحيح
[ ] Loading States لكل زر وطلب بيانات
[ ] Error States تظهر للمستخدم بوضوح
[ ] Empty States لما تكون البيانات فارغة
[ ] أنيميشن سلس وغير مزعج
[ ] الخط العربي يظهر بشكل صحيح
[ ] Hover States واضحة على العناصر التفاعلية
[ ] Focus States للـ Accessibility (استخدام لوحة المفاتيح)
[ ] التباين بين النص والخلفية كافٍ
```
