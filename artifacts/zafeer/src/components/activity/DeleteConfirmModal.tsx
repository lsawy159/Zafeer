import { Trash2 } from 'lucide-react'

interface DeleteConfirmModalProps {
  open: boolean
  deleteAllMode: boolean
  deleteFromDatabase: boolean
  setDeleteFromDatabase: (v: boolean) => void
  deleteConfirmWord: string
  setDeleteConfirmWord: (v: string) => void
  totalDbCount: number | null
  deleting: boolean
  confirmDelete: () => void | Promise<void>
  onClose: () => void
  selectedCount: number
  visibleCount: number
}

export function DeleteConfirmModal(props: DeleteConfirmModalProps) {
  const {
    open,
    deleteAllMode,
    deleteFromDatabase,
    setDeleteFromDatabase,
    deleteConfirmWord,
    setDeleteConfirmWord,
    totalDbCount,
    deleting,
    confirmDelete,
    onClose,
    selectedCount,
    visibleCount,
  } = props

  if (!open) return null

  // Confirm button disabled when "delete all from DB" and word not typed
  const requiresConfirmWord = deleteAllMode && deleteFromDatabase
  const confirmDisabled = deleting || (requiresConfirmWord && deleteConfirmWord !== 'حذف')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="app-modal-surface max-w-lg w-full">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-neutral-900">تأكيد الحذف</h3>
          </div>

          {deleteAllMode ? (
            <div className="space-y-4 mb-6">
              <p className="text-neutral-700">اختر نوع الحذف:</p>

              {/* حذف المعروض فقط */}
              <button
                onClick={() => setDeleteFromDatabase(false)}
                disabled={deleting}
                className={`w-full p-4 rounded-lg border-2 transition text-right ${
                  !deleteFromDatabase
                    ? 'border-red-500 bg-red-50'
                    : 'border-neutral-200 bg-white hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-bold text-neutral-900 mb-1">حذف السجلات المعروضة فقط</div>
                    <div className="text-sm text-neutral-600">
                      سيتم حذف {visibleCount} سجل من النتائج المُفلترة المعروضة حالياً
                    </div>
                  </div>
                  {!deleteFromDatabase && (
                    <div className="w-5 h-5 rounded-full bg-red-500 border-4 border-white shadow"></div>
                  )}
                </div>
              </button>

              {/* حذف من قاعدة البيانات */}
              <button
                onClick={() => setDeleteFromDatabase(true)}
                disabled={deleting}
                className={`w-full p-4 rounded-lg border-2 transition text-right ${
                  deleteFromDatabase
                    ? 'border-red-500 bg-red-50'
                    : 'border-neutral-200 bg-white hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-bold text-neutral-900 mb-1">
                      حذف جميع السجلات من قاعدة البيانات
                    </div>
                    <div className="text-sm text-neutral-600">
                      سيتم حذف{' '}
                      <span className="font-bold text-red-600">
                        {totalDbCount != null ? totalDbCount.toLocaleString('ar-EG') : 'جميع'}{' '}
                      </span>
                      سجل من قاعدة البيانات بشكل نهائي
                    </div>
                    <div className="text-xs text-red-600 mt-2 font-medium">
                      ⚠️ تحذير: هذه العملية لا يمكن التراجع عنها!
                    </div>
                  </div>
                  {deleteFromDatabase && (
                    <div className="w-5 h-5 rounded-full bg-red-500 border-4 border-white shadow"></div>
                  )}
                </div>
              </button>

              {/* حقل التأكيد — يظهر فقط عند اختيار "حذف من قاعدة البيانات" */}
              {deleteFromDatabase && (
                <div className="mt-2">
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    اكتب كلمة{' '}
                    <span className="font-bold text-red-600 font-mono">حذف</span>{' '}
                    للتأكيد:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmWord}
                    onChange={(e) => setDeleteConfirmWord(e.target.value)}
                    placeholder="حذف"
                    dir="rtl"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 border-neutral-300"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 mb-6">
              <p className="text-neutral-700">
                اختر نوع الحذف للسجلات المحددة ({selectedCount} نشاط):
              </p>

              {/* حذف من العرض فقط */}
              <button
                onClick={() => setDeleteFromDatabase(false)}
                disabled={deleting}
                className={`w-full p-4 rounded-lg border-2 transition text-right ${
                  !deleteFromDatabase
                    ? 'border-red-500 bg-red-50'
                    : 'border-neutral-200 bg-white hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-bold text-neutral-900 mb-1">حذف من العرض فقط</div>
                    <div className="text-sm text-neutral-600">
                      سيتم إزالة {selectedCount} سجل من العرض فقط، لكنها ستبقى في قاعدة البيانات
                    </div>
                  </div>
                  {!deleteFromDatabase && (
                    <div className="w-5 h-5 rounded-full bg-red-500 border-4 border-white shadow"></div>
                  )}
                </div>
              </button>

              {/* حذف من قاعدة البيانات */}
              <button
                onClick={() => setDeleteFromDatabase(true)}
                disabled={deleting}
                className={`w-full p-4 rounded-lg border-2 transition text-right ${
                  deleteFromDatabase
                    ? 'border-red-500 bg-red-50'
                    : 'border-neutral-200 bg-white hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-bold text-neutral-900 mb-1">حذف من قاعدة البيانات</div>
                    <div className="text-sm text-neutral-600">
                      سيتم حذف {selectedCount} سجل من قاعدة البيانات بشكل نهائي
                    </div>
                    <div className="text-xs text-red-600 mt-2 font-medium">
                      ⚠️ تحذير: هذه العملية لا يمكن التراجع عنها!
                    </div>
                  </div>
                  {deleteFromDatabase && (
                    <div className="w-5 h-5 rounded-full bg-red-500 border-4 border-white shadow"></div>
                  )}
                </div>
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => {
                onClose()
              }}
              disabled={deleting}
              className="app-button-secondary flex-1 justify-center"
            >
              إلغاء
            </button>
            <button
              onClick={confirmDelete}
              disabled={confirmDisabled}
              className="app-button-danger flex-1 justify-center"
            >
              {deleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  جاري الحذف...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  تأكيد الحذف
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
