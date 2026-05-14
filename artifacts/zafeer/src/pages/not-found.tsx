import { Link } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'

export default function NotFound() {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center bg-background"
      dir="rtl"
    >
      <div className="w-full max-w-md mx-4 rounded-2xl border border-border bg-card p-8 text-center shadow-md">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-danger-500" />
        <h1 className="text-2xl font-bold text-foreground mb-2">الصفحة غير موجودة</h1>
        <p className="text-muted-foreground text-sm mb-6">
          الرابط الذي وصلت إليه غير موجود أو تم نقله.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          العودة للرئيسية
        </Link>
      </div>
    </div>
  )
}
