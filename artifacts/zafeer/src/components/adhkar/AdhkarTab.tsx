import { useState, useEffect } from 'react'
import { Loader2, Plus, Pencil, Trash2, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/Dialog'
import { Switch } from '@/components/ui/switch'
import { useAllAdhkar, AdhkarItem } from '@/hooks/useAdhkar'
import { useAdhkarCrud } from '@/hooks/useAdhkarCrud'
import { useAdhkarSettings } from '@/hooks/useAdhkarSettings'

// ────────────────────────────────────────────────────────────────────────────
// AdhkarTab — admin-only management: CRUD + timer settings
// ────────────────────────────────────────────────────────────────────────────

export function AdhkarTab() {
  const { data: adhkar = [], isLoading } = useAllAdhkar()
  const { createAdhkar, updateAdhkar, removeAdhkar, isBusy } = useAdhkarCrud()
  const { settings, isLoading: settingsLoading, updateSettings } = useAdhkarSettings()

  // ── timer settings form ──────────────────────────────────────────────────
  const [displaySecs, setDisplaySecs] = useState('')
  const [timerSaving, setTimerSaving] = useState(false)
  const [timerError, setTimerError] = useState<string | null>(null)

  useEffect(() => {
    if (!settingsLoading) {
      setDisplaySecs(String(Math.round(settings.display_duration_ms / 1000)))
    }
  }, [settings, settingsLoading])

  const handleSaveTimers = async () => {
    const d = Number(displaySecs)
    if (!d || d < 2) {
      setTimerError('مدة العرض ≥ ثانيتين')
      return
    }
    setTimerError(null)
    setTimerSaving(true)
    try {
      await updateSettings({ display_duration_ms: d * 1000 })
    } finally {
      setTimerSaving(false)
    }
  }

  // ── dialog form ──────────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<AdhkarItem | null>(null)
  const [formText, setFormText] = useState('')
  const [formSort, setFormSort] = useState('0')
  const [formActive, setFormActive] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)

  const openAdd = () => {
    setEditItem(null)
    setFormText('')
    setFormSort(String((adhkar.length > 0 ? Math.max(...adhkar.map(a => a.sort_order)) : 0) + 1))
    setFormActive(true)
    setFormError(null)
    setDialogOpen(true)
  }

  const openEdit = (item: AdhkarItem) => {
    setEditItem(item)
    setFormText(item.text)
    setFormSort(String(item.sort_order))
    setFormActive(item.is_active)
    setFormError(null)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formText.trim()) { setFormError('نص الذكر مطلوب'); return }
    const sort = Number(formSort)
    if (isNaN(sort)) { setFormError('ترتيب غير صحيح'); return }
    setFormError(null)
    try {
      if (editItem) {
        await updateAdhkar(editItem.id, { text: formText.trim(), sort_order: sort, is_active: formActive })
      } else {
        await createAdhkar({ text: formText.trim(), sort_order: sort, is_active: formActive })
      }
      setDialogOpen(false)
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'حدث خطأ')
    }
  }

  // ── delete confirm ───────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<AdhkarItem | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const confirmDelete = (item: AdhkarItem) => { setDeleteTarget(item); setDeleteOpen(true) }
  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await removeAdhkar(deleteTarget.id)
      setDeleteOpen(false)
      setDeleteTarget(null)
    } catch {
      // keep dialog open on error
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6" dir="rtl">

      {/* Timer Settings */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="text-base font-semibold text-foreground mb-4">إعدادات التوقيت</h2>
        {settingsLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : (
          <div className="max-w-xs space-y-1.5">
            <label className="text-sm font-medium text-foreground">مدة عرض الذكر (ثواني)</label>
            <Input
              type="number"
              min={2}
              value={displaySecs}
              onChange={e => setDisplaySecs(e.target.value)}
              className="text-right"
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground">الحد الأدنى: ثانيتان</p>
          </div>
        )}
        {timerError && <p className="text-sm text-red-500 mt-2">{timerError}</p>}
        <div className="mt-4">
          <Button onClick={handleSaveTimers} disabled={timerSaving || settingsLoading} size="sm">
            {timerSaving && <Loader2 className="w-3.5 h-3.5 animate-spin ml-1.5" />}
            حفظ التوقيت
          </Button>
        </div>
      </section>

      {/* Adhkar List */}
      <section className="rounded-2xl border border-border bg-surface shadow-sm">
        <div className="flex items-center justify-between p-5 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">قائمة الأذكار</h2>
            <span className="text-xs text-muted-foreground">({adhkar.length})</span>
          </div>
          <Button onClick={openAdd} size="sm" disabled={isBusy}>
            <Plus className="w-4 h-4 ml-1" />
            إضافة ذكر
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : adhkar.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">لا توجد أذكار مضافة</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-border bg-muted/40 text-muted-foreground">
                  <th className="px-5 py-2.5 text-right font-medium">الترتيب</th>
                  <th className="px-5 py-2.5 text-right font-medium">نص الذكر</th>
                  <th className="px-5 py-2.5 text-right font-medium">الحالة</th>
                  <th className="px-5 py-2.5 text-right font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {adhkar.map(item => (
                  <tr key={item.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3 text-muted-foreground tabular-nums">{item.sort_order}</td>
                    <td className="px-5 py-3 max-w-[360px]">
                      <span className={cn('line-clamp-2 leading-relaxed', !item.is_active && 'text-muted-foreground')}>
                        {item.text}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                        item.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-muted text-muted-foreground'
                      )}>
                        {item.is_active ? 'مفعّل' : 'معطّل'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEdit(item)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          type="button"
                          aria-label="تعديل"
                          disabled={isBusy}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => confirmDelete(item)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                          type="button"
                          aria-label="حذف"
                          disabled={isBusy}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="app-modal-surface" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editItem ? 'تعديل ذكر' : 'إضافة ذكر جديد'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">نص الذكر *</label>
              <Textarea
                value={formText}
                onChange={e => setFormText(e.target.value)}
                placeholder="اكتب نص الذكر هنا..."
                className="min-h-[100px] text-right"
                dir="rtl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">الترتيب</label>
                <Input
                  type="number"
                  value={formSort}
                  onChange={e => setFormSort(e.target.value)}
                  className="text-right"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">الحالة</label>
                <div className="flex items-center gap-2 pt-1">
                  <Switch checked={formActive} onCheckedChange={setFormActive} />
                  <span className="text-sm text-muted-foreground">{formActive ? 'مفعّل' : 'معطّل'}</span>
                </div>
              </div>
            </div>
            {formError && <p className="text-sm text-red-500">{formError}</p>}
          </div>

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm">إلغاء</Button>
            </DialogClose>
            <Button size="sm" onClick={handleSave} disabled={isBusy}>
              {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin ml-1.5" />}
              {editItem ? 'حفظ التعديلات' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="app-modal-surface" dir="rtl">
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2 leading-relaxed">
            سيتم حذف الذكر نهائياً. لا يمكن التراجع عن هذا الإجراء.
          </p>
          {deleteTarget && (
            <blockquote className="border-r-2 border-border pr-3 text-sm text-foreground line-clamp-3 leading-relaxed">
              {deleteTarget.text}
            </blockquote>
          )}
          <DialogFooter className="gap-2 mt-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm">إلغاء</Button>
            </DialogClose>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isBusy}
            >
              {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin ml-1.5" />}
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
