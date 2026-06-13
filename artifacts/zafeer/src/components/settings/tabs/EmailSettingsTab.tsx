import { AlertTriangle, Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SendEmailModal } from '@/components/settings/backup/SendEmailModal'
import { useEmailSettings } from './EmailSettingsTab/useEmailSettings'
import { SMTPSection } from './EmailSettingsTab/SMTPSection'
import { RecipientsSection } from './EmailSettingsTab/RecipientsSection'
import { BackupEmailSection } from './EmailSettingsTab/BackupEmailSection'
import { usePermissions } from '@/utils/permissions'
export function EmailSettingsTab() {
  const { canEdit } = usePermissions()
  const canEditEmail = canEdit('emailSettings')
  const ctx = useEmailSettings()
  const {
    adminEmail, setAdminEmail,
    notificationMethods, setNotificationMethods,
    quietHoursStart, setQuietHoursStart,
    quietHoursEnd, setQuietHoursEnd,
    adminEmailError, setAdminEmailError,
    isLoadingEmailSettings, isSavingEmailSettings,
    recipientsConfig,
    isLoadingRecipients, isSavingRecipients,
    showAddRecipientForm, setShowAddRecipientForm,
    newRecipientEmail, setNewRecipientEmail,
    newRecipientExpiryAlerts, setNewRecipientExpiryAlerts,
    newRecipientBackupNotifications, setNewRecipientBackupNotifications,
    newRecipientDailyDigest, setNewRecipientDailyDigest,
    newRecipientError, setNewRecipientError,
    recentBackups, recentBackupsState,
    backupEmailModalTarget, setBackupEmailModalTarget,
    csvSending, csvSendMsg,
    expiredSettings,
    isBusy,
    saveEmailSettings,
    handleAddRecipient,
    handleDeleteRecipient,
    handleRecipientPermissionChange,
    handleSendCsvReport,
    loadRecentBackups,
    handleExpiredInclusionChange,
    resetAddRecipientForm,
  } = ctx

  return (
    <div className="space-y-6" dir="rtl">
      <SMTPSection
        adminEmail={adminEmail}
        setAdminEmail={setAdminEmail}
        notificationMethods={notificationMethods}
        setNotificationMethods={setNotificationMethods}
        quietHoursStart={quietHoursStart}
        setQuietHoursStart={setQuietHoursStart}
        quietHoursEnd={quietHoursEnd}
        setQuietHoursEnd={setQuietHoursEnd}
        adminEmailError={adminEmailError}
        setAdminEmailError={setAdminEmailError}
        isLoadingEmailSettings={isLoadingEmailSettings}
        isSavingEmailSettings={isSavingEmailSettings}
        saveEmailSettings={saveEmailSettings}
        canEdit={canEditEmail}
      />

      {/* تضمين المنتهي */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">تضمين المنتهي</h2>
            <p className="text-xs text-foreground-tertiary">
              تحكم في إظهار العناصر المنتهية داخل ملخص اليومي وإشعارات البريد الفردية.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {(
            [
              { key: 'include_in_daily_email' as const, label: 'تضمين المنتهي في الملخص اليومي' },
              { key: 'include_in_notification_emails' as const, label: 'تضمين المنتهي في إشعارات البريد الفردية' },
            ] as const
          ).map(({ key, label }) => (
            <label
              key={key}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface-secondary/30 px-3.5 py-3"
            >
              <span className="text-sm text-foreground-secondary">{label}</span>
              <input
                type="checkbox"
                checked={expiredSettings[key]}
                onChange={(event) => handleExpiredInclusionChange(key, event.target.checked)}
                disabled={!canEditEmail}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              />
            </label>
          ))}
        </div>
      </section>

      <RecipientsSection
        recipientsConfig={recipientsConfig}
        isLoadingRecipients={isLoadingRecipients}
        isSavingRecipients={isSavingRecipients}
        showAddRecipientForm={showAddRecipientForm}
        setShowAddRecipientForm={setShowAddRecipientForm}
        newRecipientEmail={newRecipientEmail}
        setNewRecipientEmail={setNewRecipientEmail}
        newRecipientExpiryAlerts={newRecipientExpiryAlerts}
        setNewRecipientExpiryAlerts={setNewRecipientExpiryAlerts}
        newRecipientBackupNotifications={newRecipientBackupNotifications}
        setNewRecipientBackupNotifications={setNewRecipientBackupNotifications}
        newRecipientDailyDigest={newRecipientDailyDigest}
        setNewRecipientDailyDigest={setNewRecipientDailyDigest}
        newRecipientError={newRecipientError}
        setNewRecipientError={setNewRecipientError}
        isBusy={isBusy}
        handleAddRecipient={handleAddRecipient}
        handleDeleteRecipient={handleDeleteRecipient}
        handleRecipientPermissionChange={handleRecipientPermissionChange}
        resetAddRecipientForm={resetAddRecipientForm}
        canEdit={canEditEmail}
      />

      {/* إرسال تقرير التنبيهات */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Send className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">إرسال تقرير التنبيهات</h2>
              <p className="text-xs text-foreground-tertiary">يولد CSV ويرسله إلى المسؤول مباشرة</p>
            </div>
          </div>
          <Button type="button" onClick={handleSendCsvReport} disabled={csvSending || !canEditEmail} size="sm">
            {csvSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            إرسال الآن
          </Button>
        </div>
        {csvSendMsg && (
          <p className={`text-sm font-medium ${csvSendMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
            {csvSendMsg.text}
          </p>
        )}
      </section>

      <BackupEmailSection
        recentBackups={recentBackups}
        recentBackupsState={recentBackupsState}
        setBackupEmailModalTarget={setBackupEmailModalTarget}
        loadRecentBackups={loadRecentBackups}
      />

      {backupEmailModalTarget && (
        <SendEmailModal
          backupId={backupEmailModalTarget.id}
          backupDate={
            backupEmailModalTarget.completed_at
              ? new Date(backupEmailModalTarget.completed_at).toLocaleDateString('ar-EG')
              : undefined
          }
          onClose={() => setBackupEmailModalTarget(null)}
        />
      )}
    </div>
  )
}
