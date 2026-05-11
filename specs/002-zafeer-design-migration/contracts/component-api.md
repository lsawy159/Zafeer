# Component API Stability Contract

> هذا العقد يضمن أن إعادة التصميم لا تكسر أي استدعاء موجود لمكوّن. التعديلات بصرية فقط.

## Inviolable Rules

1. **لا حذف props.** أي prop مُستخدم في الكود الحالي يبقى.
2. **لا تغيير قيم variants.** `<Button variant="primary">` و `<Button variant="secondary">` و `<Button variant="outline">` و `<Button variant="ghost">` و `<Button variant="danger">` كلها تستمر بالعمل.
3. **لا تغيير سلوك events.** `onClick`, `onChange`, `onFocus` … تظل بنفس signatures.
4. **لا تغيير ARIA attributes.** ما هو معرّف الآن يبقى.
5. **لا تغيير forwarding refs.** المكوّنات التي تستخدم `forwardRef` تستمر.

## Component-by-Component Contract

### Button (`src/components/ui/Button.tsx`)

**Props (يجب أن تبقى)**:
- `variant`: `"primary" | "secondary" | "outline" | "ghost" | "danger"` (أو ما هو موجود حالياً — لا يُغيَّر)
- `size`, `disabled`, `aria-busy`, `type`, `onClick`, all standard `ButtonHTMLAttributes`
- `asChild` (إن وُجد لـ Radix Slot)

**يتغيّر فقط**: classNames المُولَّدة، tokens المستخدمة، `:focus-visible` shadow.

### Input (`src/components/ui/Input.tsx`)

**Props (يجب أن تبقى)**: كل `InputHTMLAttributes`، `error`, `label` إن وُجدت.
**يتغيّر فقط**: height (h-10)، radius، borders، focus shadow، RTL classes.

### StatusBadge (`src/components/ui/StatusBadge.tsx`)

**Props**: `status`/`variant` (success/warning/danger/info)، `children`.
**يتغيّر فقط**: token-based colors، subtle backgrounds.

### StatCard (`src/components/ui/StatCard.tsx`)

**Props**: `title`, `value`, `trend`, `icon`, … (كل ما هو موجود).
**يتغيّر فقط**: padding، radius، shadow، typography على الأرقام (`.metric` + tabular-nums).

### Sidebar/Header/GlobalSearchModal

**Props**: لا تتغيّر.
**يتغيّر فقط**: visual styling لتطابق reference HTML.

## Acceptance Test (post-migration)

```bash
cd artifacts/sawtracker
pnpm typecheck       # MUST pass
pnpm lint            # MUST pass
pnpm test            # all existing component tests MUST pass without modification
```

أي فشل في `pnpm test` بسبب snapshot أو DOM assertion = إشارة إلى أن الـ API تغيّر — يجب التراجع.

## Approval Sign-off

- **Initial gate**: قبل بدء التنفيذ — هذا العقد مرجع.
- **Post-implementation**: مراجعة diff لكل مكوّن للتأكد أن props/variants لم تُلمس.
