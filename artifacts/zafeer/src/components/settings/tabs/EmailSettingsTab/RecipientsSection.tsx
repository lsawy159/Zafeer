import { Bell, Loader2, Lock, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { Switch } from '@/components/ui/switch'
import type { useEmailSettings } from './useEmailSettings'

type Ctx = ReturnType<typeof useEmailSettings>

function RecipientPermissionToggle({
  label, checked, disabled, onCheckedChange,
}: {
  label: string
  checked: boolean
  disabled: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-surface-secondary/40 px-3 py-2">
      <span className="text-xs text-foreground-secondary">{label}</span>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  )
}

interface Props {
  recipientsConfig: Ctx['recipientsConfig']
  isLoadingRecipients: Ctx['isLoadingRecipients']
  isSavingRecipients: Ctx['isSavingRecipients']
  showAddRecipientForm: Ctx['showAddRecipientForm']
  setShowAddRecipientForm: Ctx['setShowAddRecipientForm']
  newRecipientEmail: Ctx['newRecipientEmail']
  setNewRecipientEmail: Ctx['setNewRecipientEmail']
  newRecipientExpiryAlerts: Ctx['newRecipientExpiryAlerts']
  setNewRecipientExpiryAlerts: Ctx['setNewRecipientExpiryAlerts']
  newRecipientBackupNotifications: Ctx['newRecipientBackupNotifications']
  setNewRecipientBackupNotifications: Ctx['setNewRecipientBackupNotifications']
  newRecipientDailyDigest: Ctx['newRecipientDailyDigest']
  setNewRecipientDailyDigest: Ctx['setNewRecipientDailyDigest']
  newRecipientError: Ctx['newRecipientError']
  setNewRecipientError: Ctx['setNewRecipientError']
  isBusy: Ctx['isBusy']
  handleAddRecipient: Ctx['handleAddRecipient']
  handleDeleteRecipient: Ctx['handleDeleteRecipient']
  handleRecipientPermissionChange: Ctx['handleRecipientPermissionChange']
  resetAddRecipientForm: Ctx['resetAddRecipientForm']
}

export function RecipientsSection({
  recipientsConfig,
  isLoadingRecipients, isSavingRecipients,
  showAddRecipientForm, setShowAddRecipientForm,
  newRecipientEmail, setNewRecipientEmail,
  newRecipientExpiryAlerts, setNewRecipientExpiryAlerts,
  newRecipientBackupNotifications, setNewRecipientBackupNotifications,
  newRecipientDailyDigest, setNewRecipientDailyDigest,
  newRecipientError, setNewRecipientError,
  isBusy,
  handleAddRecipient, handleDeleteRecipient, handleRecipientPermissionChange,
  resetAddRecipientForm,
}: Props) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">مستلمو الإيميلات</h2>
            <p className="text-xs text-foreground-tertiary">
              primary_admin ثابت، وباقي المستلمين يمكن تعديل صلاحياتهم
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setShowAddRecipientForm((prev) => !prev)}
          disabled={isBusy}
        >
          <Plus className="h-4 w-4" />
          {showAddRecipientForm ? 'إغلاق' : 'إضافة مستلم'}
        </Button>
      </div>

      {isLoadingRecipients ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/70 bg-surface-secondary/30 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-foreground">primary_admin</h3>
                  <Badge variant="secondary" className="gap-1">
                    <Lock className="h-3 w-3" />
                    مقفول
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-foreground-secondary" dir="ltr">
                  {recipientsConfig?.primary_admin || 'غير مضبوط'}
                </p>
              </div>
            </div>
          </div>

          {showAddRecipientForm && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="space-y-1.5 lg:col-span-2">
                  <label className="text-xs font-medium text-foreground-secondary">البريد الإلكتروني</label>
                  <Input
                    type="email"
                    value={newRecipientEmail}
                    onChange={(e) => {
                      setNewRecipientEmail(e.target.value)
                      if (newRecipientError) setNewRecipientError(null)
                    }}
                    placeholder="name@example.com"
                    dir="ltr"
                  />
                  {newRecipientError && <p className="text-xs text-red-600">{newRecipientError}</p>}
                </div>
                <RecipientPermissionToggle
                  label="تنبيهات انتهاء الصلاحية"
                  checked={newRecipientExpiryAlerts}
                  disabled={isBusy}
                  onCheckedChange={setNewRecipientExpiryAlerts}
                />
                <RecipientPermissionToggle
                  label="النسخ الاحتياطية"
                  checked={newRecipientBackupNotifications}
                  disabled={isBusy}
                  onCheckedChange={setNewRecipientBackupNotifications}
                />
                <RecipientPermissionToggle
                  label="الملخص اليومي"
                  checked={newRecipientDailyDigest}
                  disabled={isBusy}
                  onCheckedChange={setNewRecipientDailyDigest}
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={resetAddRecipientForm}>إلغاء</Button>
                <Button type="button" size="sm" onClick={handleAddRecipient} disabled={isBusy}>
                  {isSavingRecipients ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  إضافة
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {(recipientsConfig?.additional_recipients ?? []).length === 0 ? (
              <p className="text-sm text-foreground-tertiary">لا يوجد مستلمون إضافيون حالياً</p>
            ) : (
              recipientsConfig?.additional_recipients.map((recipient) => (
                <div
                  key={recipient.id}
                  className="rounded-xl border border-border/70 bg-surface-secondary/30 p-4 space-y-4"
                >
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-medium text-foreground" dir="ltr">{recipient.email}</p>
                      <p className="text-xs text-foreground-tertiary">
                        تمت الإضافة: {new Date(recipient.added_at).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleDeleteRecipient(recipient.id)}
                      disabled={isBusy}
                    >
                      <Trash2 className="h-4 w-4" />
                      حذف
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                    <RecipientPermissionToggle
                      label="تنبيهات انتهاء الصلاحية"
                      checked={recipient.expiryAlerts}
                      disabled={isBusy}
                      onCheckedChange={(checked) =>
                        void handleRecipientPermissionChange(recipient.id, 'expiryAlerts', checked)
                      }
                    />
                    <RecipientPermissionToggle
                      label="النسخ الاحتياطية"
                      checked={recipient.backupNotifications}
                      disabled={isBusy}
                      onCheckedChange={(checked) =>
                        void handleRecipientPermissionChange(recipient.id, 'backupNotifications', checked)
                      }
                    />
                    <RecipientPermissionToggle
                      label="الملخص اليومي"
                      checked={recipient.dailyDigest}
                      disabled={isBusy}
                      onCheckedChange={(checked) =>
                        void handleRecipientPermissionChange(recipient.id, 'dailyDigest', checked)
                      }
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </section>
  )
}
