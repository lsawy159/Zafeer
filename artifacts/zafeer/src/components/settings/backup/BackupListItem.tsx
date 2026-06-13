import { useState } from 'react'
import { Download, FileSpreadsheet, RotateCcw, Camera } from 'lucide-react'
import type { BackupRecord } from '@/lib/backupService'
import { getBackupDownloadUrl } from '@/lib/backupService'
import { RestorePreviewModal } from './RestorePreviewModal'
import { formatBytes } from '@/utils/formatBytes'

function formatDate(iso: string): string {
  const d = new Date(iso)
  const day = String(d.getUTCDate()).padStart(2, '0')
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const year = d.getUTCFullYear()
  const hours = String(d.getUTCHours()).padStart(2, '0')
  const mins = String(d.getUTCMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${mins}`
}

function formatBackupType(type: string): string {
  switch (type) {
    case 'full': return 'نسخة كاملة (يدوي)'
    case 'scheduled': return 'نسخة تلقائية'
    case 'pre-restore-snapshot': return 'Snapshot وقائي'
    default: return type
  }
}

interface Props {
  backup: BackupRecord
  onCsvDownload?: (backup: BackupRecord) => void
  csvDownloading?: boolean
}

export function BackupListItem({ backup, onCsvDownload, csvDownloading }: Props) {
  const [downloading, setDownloading] = useState(false)
  const [showRestoreModal, setShowRestoreModal] = useState(false)

  const isSnapshot = backup.backup_type === 'pre-restore-snapshot'
  const tableCount = backup.tables_included?.length ?? 0
  const totalRecords = backup.table_record_counts
    ? Object.values(backup.table_record_counts).reduce((a, b) => a + b, 0)
    : null

  const handleDownloadJson = async () => {
    if (!backup.file_path) return
    setDownloading(true)
    try {
      const url = await getBackupDownloadUrl(backup.file_path)
      if (url) {
        const a = document.createElement('a')
        a.href = url
        a.download = `backup-${backup.id}.json.gz`
        a.click()
      }
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <div
        className={`border rounded-lg p-4 space-y-3 transition ${
          isSnapshot
            ? 'border-blue-200 bg-blue-50'
            : 'border-neutral-200 bg-white hover:bg-neutral-50'
        }`}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {isSnapshot && (
              <Camera className="w-4 h-4 text-blue-500 shrink-0" />
            )}
            <div>
              <span className={`text-sm font-medium ${isSnapshot ? 'text-blue-700' : 'text-neutral-800'}`}>
                {formatBackupType(backup.backup_type)}
              </span>
              {isSnapshot && (
                <span className="mr-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  Snapshot وقائي
                </span>
              )}
            </div>
          </div>
          <span className="text-xs text-neutral-400 shrink-0">{formatDate(backup.started_at)}</span>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-4 text-sm text-neutral-600">
          {backup.file_size != null && (
            <span>{formatBytes(backup.file_size)}</span>
          )}
          {tableCount > 0 && (
            <span>{tableCount} جدول</span>
          )}
          {totalRecords != null && (
            <span>{totalRecords.toLocaleString('ar-EG')} سجل</span>
          )}
          <span className={`font-medium ${
            backup.status === 'completed' ? 'text-green-600'
            : backup.status === 'failed' ? 'text-red-600'
            : 'text-orange-500'
          }`}>
            {backup.status === 'completed' ? 'مكتملة'
              : backup.status === 'failed' ? 'فشلت'
              : 'جارية...'}
          </span>
        </div>

        {/* Actions */}
        {backup.status === 'completed' && (
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={handleDownloadJson}
              disabled={downloading}
              className="app-button-secondary text-xs py-1.5 px-3 gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              {downloading ? 'جاري التحميل...' : 'تحميل JSON'}
            </button>

            <button
              onClick={() => onCsvDownload?.(backup)}
              disabled={csvDownloading}
              className="app-button-secondary text-xs py-1.5 px-3 gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              {csvDownloading ? 'جاري التحضير...' : 'تحميل CSV'}
            </button>

            {!isSnapshot && (
              <button
                onClick={() => setShowRestoreModal(true)}
                className="text-xs py-1.5 px-3 gap-1.5 flex items-center rounded-lg border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                معاينة واستعادة
              </button>
            )}
          </div>
        )}
      </div>

      {showRestoreModal && (
        <RestorePreviewModal backup={backup} onClose={() => setShowRestoreModal(false)} />
      )}
    </>
  )
}
