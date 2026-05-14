import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase, ActivityLog, User } from '@/lib/supabase'
import Layout from '@/components/layout/Layout'
import { useAuth } from '@/contexts/AuthContext'
import { logger } from '@/utils/logger'
import {
  Activity,
  RefreshCw,
  Download,
  Trash2,
} from 'lucide-react'
import { formatDateTimeWithHijri } from '@/utils/dateFormatter'
import { toast } from 'sonner'
import { saveAs } from 'file-saver'
import { usePermissions } from '@/utils/permissions'
import { loadXlsx } from '@/utils/lazyXlsx'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { StatsCards } from '@/components/activity/StatsCards'
import { LogsFilters } from '@/components/activity/LogsFilters'
import { DeleteConfirmModal } from '@/components/activity/DeleteConfirmModal'
import { LogDetailsModal } from '@/components/activity/LogDetailsModal'
import { LogsTable } from '@/components/activity/LogsTable'
import { Button } from '@/components/ui/Button'
import {
  getActionIcon,
  getActionColor,
  isImportantAction,
  getActionLabel,
  getEntityLabel,
  generateActivityDescription,
} from '@/components/activity/activityLogHelpers'

type ActionFilter = 'all' | 'create' | 'update' | 'delete' | 'login' | 'logout'
type EntityFilter = 'all' | 'employee' | 'company' | 'user' | 'settings'
type DateFilter = 'all' | 'today' | 'week' | 'month'

export default function ActivityLogs({ embedded = false }: { embedded?: boolean } = {}) {
  const { user } = useAuth()
  const { canView } = usePermissions()
  const isAdmin = user?.role === 'admin'

  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [usersMap, setUsersMap] = useState<Map<string, User>>(new Map())
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all')
  const [entityFilter, setEntityFilter] = useState<EntityFilter>('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null)
  const [selectedLogIds, setSelectedLogIds] = useState<Set<number>>(new Set())
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteAllMode, setDeleteAllMode] = useState(false)
  const [deleteFromDatabase, setDeleteFromDatabase] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  useEffect(() => {
    loadLogs()
  }, [])

  // Debounce search term to reduce re-computation
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300)

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm, actionFilter, entityFilter, dateFilter])

  // إغلاق بطاقة التفاصيل عند الضغط على Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedLog) {
        setSelectedLog(null)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [selectedLog])

  // التحقق من صلاحية العرض بدون إرجاع مبكر لتعزيز ترتيب الـ Hooks
  const unauthorized = !canView('activityLogs')

  const loadLogs = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('activity_log')
        .select(
          'id,user_id,action,entity_type,entity_id,details,ip_address,user_agent,session_id,operation,operation_status,affected_rows,old_data,new_data,created_at'
        )
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) throw error
      setLogs(data || [])

      // جلب بيانات المستخدمين
      const userIds = new Set<string>()
      data?.forEach((log) => {
        if (log.user_id) {
          userIds.add(log.user_id)
        }
      })

      if (userIds.size > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, email, full_name, username')
          .in('id', Array.from(userIds))

        if (usersError) {
          console.error('Error loading users:', usersError)
        } else if (usersData) {
          const users = new Map<string, User>()
          usersData.forEach((user) => {
            users.set(user.id, {
              id: user.id,
              username: user.username || user.email.split('@')[0],
              email: user.email,
              full_name: user.full_name,
              role: 'user' as const,
              permissions: {},
              is_active: true,
              created_at: new Date().toISOString(),
            })
          })
          setUsersMap(users)
        }
      }
    } catch (error) {
      console.error('Error loading activity logs:', error)
      toast.error('فشل تحميل سجل النشاطات')
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = useMemo(
    () =>
      logs.filter((log) => {
        // فلتر البحث
        if (debouncedSearchTerm) {
          const search = debouncedSearchTerm.toLowerCase()
          const matchesAction = log.action.toLowerCase().includes(search)
          const matchesEntity = log.entity_type?.toLowerCase().includes(search)
          const matchesDetails = JSON.stringify(log.details).toLowerCase().includes(search)
          if (!matchesAction && !matchesEntity && !matchesDetails) return false
        }

        // فلتر العملية - تحسين المطابقة
        if (actionFilter !== 'all') {
          const actionLower = log.action.toLowerCase()
          const filterLower = actionFilter.toLowerCase()

          // مطابقة دقيقة بدلاً من includes
          const isMatch =
            actionLower === filterLower || // مطابقة دقيقة
            actionLower.includes(filterLower) || // احتواء
            // معالجة حالات خاصة للعربية والإنجليزية
            (filterLower === 'create' &&
              (actionLower.includes('create') ||
                actionLower.includes('إنشاء') ||
                actionLower.includes('add') ||
                actionLower.includes('إضافة'))) ||
            (filterLower === 'update' &&
              (actionLower.includes('update') ||
                actionLower.includes('edit') ||
                actionLower.includes('تحديث') ||
                actionLower.includes('تعديل'))) ||
            (filterLower === 'delete' &&
              (actionLower.includes('delete') ||
                actionLower.includes('remove') ||
                actionLower.includes('حذف'))) ||
            (filterLower === 'login' &&
              (actionLower.includes('login') ||
                actionLower.includes('logout') ||
                actionLower.includes('دخول') ||
                actionLower.includes('خروج')))

          if (!isMatch) return false
        }

        // فلتر نوع الكيان - تصحيح حساسية الأحرف
        if (entityFilter !== 'all') {
          const entityTypeLower = log.entity_type?.toLowerCase() || ''
          const entityFilterLower = entityFilter.toLowerCase()

          if (entityTypeLower !== entityFilterLower) return false
        }

        // فلتر التاريخ - تحسين المنطق
        if (dateFilter !== 'all') {
          const logDate = new Date(log.created_at)
          const now = new Date()
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

          if (dateFilter === 'today' && (logDate < today || logDate >= tomorrow)) return false
          if (dateFilter === 'week' && logDate < weekAgo) return false
          if (dateFilter === 'month' && logDate < monthAgo) return false
        }

        return true
      }),
    [logs, debouncedSearchTerm, actionFilter, entityFilter, dateFilter]
  )

  // حساب الإحصائيات (باستخدام filteredLogs) مع حساب التواريخ داخل useMemo
  const todayLogs = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return filteredLogs.filter((log) => new Date(log.created_at) >= today)
  }, [filteredLogs])
  const weekLogs = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    return filteredLogs.filter((log) => new Date(log.created_at) >= weekAgo)
  }, [filteredLogs])
  const employeeLogs = useMemo(
    () => filteredLogs.filter((log) => log.entity_type?.toLowerCase() === 'employee'),
    [filteredLogs]
  )
  const companyLogs = useMemo(
    () => filteredLogs.filter((log) => log.entity_type?.toLowerCase() === 'company'),
    [filteredLogs]
  )
  const createLogs = useMemo(
    () =>
      filteredLogs.filter((l) => {
        const action = l.action.toLowerCase()
        return (
          action.includes('create') ||
          action.includes('add') ||
          action.includes('إنشاء') ||
          action.includes('إضافة')
        )
      }),
    [filteredLogs]
  )
  const updateLogs = useMemo(
    () =>
      filteredLogs.filter((l) => {
        const action = l.action.toLowerCase()
        return (
          action.includes('update') ||
          action.includes('edit') ||
          action.includes('تحديث') ||
          action.includes('تعديل')
        )
      }),
    [filteredLogs]
  )
  const deleteLogs = useMemo(
    () =>
      filteredLogs.filter((l) => {
        const action = l.action.toLowerCase()
        return action.includes('delete') || action.includes('remove') || action.includes('حذف')
      }),
    [filteredLogs]
  )

  // Pagination calculations
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, filteredLogs.length)
  const totalPages = useMemo(
    () => Math.ceil(filteredLogs.length / itemsPerPage),
    [filteredLogs, itemsPerPage]
  )
  const paginatedLogs = useMemo(
    () => filteredLogs.slice(startIndex, endIndex),
    [filteredLogs, startIndex, endIndex]
  )

  const allSelected =
    paginatedLogs.length > 0 && paginatedLogs.every((log) => selectedLogIds.has(log.id))
  const someSelected = paginatedLogs.some((log) => selectedLogIds.has(log.id)) && !allSelected

  // دوال التحديد والحذف
  const handleSelectAll = useCallback(() => {
    const pageSlice = filteredLogs.slice(startIndex, endIndex)
    if (
      selectedLogIds.size === pageSlice.length &&
      pageSlice.every((log) => selectedLogIds.has(log.id))
    ) {
      // إلغاء تحديد جميع العناصر في الصفحة الحالية
      const newSelected = new Set(selectedLogIds)
      pageSlice.forEach((log) => newSelected.delete(log.id))
      setSelectedLogIds(newSelected)
    } else {
      // تحديد جميع العناصر في الصفحة الحالية
      const newSelected = new Set(selectedLogIds)
      pageSlice.forEach((log) => newSelected.add(log.id))
      setSelectedLogIds(newSelected)
    }
  }, [selectedLogIds, filteredLogs, startIndex, endIndex])

  const handleSelectLog = useCallback(
    (logId: number) => {
      const newSelected = new Set(selectedLogIds)
      if (newSelected.has(logId)) {
        newSelected.delete(logId)
      } else {
        newSelected.add(logId)
      }
      setSelectedLogIds(newSelected)
    },
    [selectedLogIds]
  )

  const handleDeleteSelected = useCallback(() => {
    if (selectedLogIds.size === 0) {
      toast.error('لم يتم تحديد أي نشاطات للحذف')
      return
    }
    setDeleteAllMode(false)
    setDeleteFromDatabase(false) // افتراضي: حذف من العرض فقط
    setShowDeleteModal(true)
  }, [selectedLogIds])

  const handleDeleteAll = useCallback(() => {
    if (filteredLogs.length === 0) {
      toast.error('لا توجد نشاطات للحذف')
      return
    }
    setDeleteAllMode(true)
    setDeleteFromDatabase(false) // افتراضي: حذف المعروض فقط
    setShowDeleteModal(true)
  }, [filteredLogs])

  // دالة لحذف جميع السجلات من قاعدة البيانات
  const deleteAllFromDatabase = async (): Promise<number> => {
    let totalDeleted = 0
    const batchSize = 500

    // جلب جميع IDs من قاعدة البيانات بدون limit
    let hasMore = true
    let offset = 0

    while (hasMore) {
      const { data: batchData, error: fetchError } = await supabase
        .from('activity_log')
        .select('id')
        .order('id', { ascending: true })
        .range(offset, offset + batchSize - 1)

      if (fetchError) {
        console.error('[ActivityLogs] Error fetching batch for deletion:', fetchError)
        throw fetchError
      }

      if (!batchData || batchData.length === 0) {
        hasMore = false
        break
      }

      const batchIds = batchData.map((log) => log.id)

      // حذف الدفعة
      const { data: deletedData, error: deleteError } = await supabase
        .from('activity_log')
        .delete()
        .in('id', batchIds)
        .select()

      if (deleteError) {
        console.error(`[ActivityLogs] Error deleting batch:`, deleteError)
        throw deleteError
      }

      const actualDeleted = deletedData?.length || 0
      totalDeleted += actualDeleted

      logger.debug(`[ActivityLogs] Deleted batch: ${actualDeleted} rows, Total: ${totalDeleted}`)

      // إذا كانت الدفعة أقل من batchSize، يعني وصلنا للنهاية
      if (batchData.length < batchSize) {
        hasMore = false
      } else {
        offset += batchSize
      }
    }

    return totalDeleted
  }

  const confirmDelete = async () => {
    if (!isAdmin) {
      toast.error('غير مصرح لك بحذف سجل النشاطات')
      return
    }

    setDeleting(true)
    try {
      if (deleteAllMode) {
        if (deleteFromDatabase) {
          // حذف جميع السجلات من قاعدة البيانات
          logger.debug('[ActivityLogs] Starting delete of ALL logs from database')

          const totalDeleted = await deleteAllFromDatabase()

          if (totalDeleted === 0) {
            toast.error('فشل حذف النشاطات. قد تكون هناك مشكلة في الصلاحيات أو RLS policies')
            console.error(
              '[ActivityLogs] No rows were deleted. Check RLS policies for DELETE on activity_log table'
            )
          } else {
            toast.success(`تم حذف جميع النشاطات من قاعدة البيانات (${totalDeleted} نشاط) بنجاح`)
          }

          setLogs([])
          setUsersMap(new Map())
          await loadLogs()
        } else {
          // حذف السجلات المعروضة فقط
          const allIds = logs.map((log) => log.id)

          if (allIds.length === 0) {
            toast.error('لا توجد نشاطات للحذف')
            setDeleting(false)
            return
          }

          logger.debug(`[ActivityLogs] Starting delete of ${allIds.length} visible logs`)

          // حذف بالدفعات
          const batchSize = 500
          let deletedCount = 0
          let failedBatches = 0

          for (let i = 0; i < allIds.length; i += batchSize) {
            const batch = allIds.slice(i, i + batchSize)
            logger.debug(
              `[ActivityLogs] Deleting batch ${Math.floor(i / batchSize) + 1}, IDs: ${batch.length}`
            )

            const { data, error } = await supabase
              .from('activity_log')
              .delete()
              .in('id', batch)
              .select()

            if (error) {
              console.error(
                `[ActivityLogs] Error deleting batch ${Math.floor(i / batchSize) + 1}:`,
                error
              )
              failedBatches++
              continue
            }

            const actualDeleted = data?.length || 0
            logger.debug(
              `[ActivityLogs] Batch ${Math.floor(i / batchSize) + 1} deleted: ${actualDeleted} rows`
            )
            deletedCount += actualDeleted
          }

          if (failedBatches > 0) {
            toast.error(
              `تم حذف ${deletedCount} نشاط من ${allIds.length}. فشل حذف ${failedBatches} دفعة`
            )
          } else if (deletedCount === 0) {
            toast.error('فشل حذف النشاطات. قد تكون هناك مشكلة في الصلاحيات أو RLS policies')
            console.error(
              '[ActivityLogs] No rows were deleted. Check RLS policies for DELETE on activity_log table'
            )
          } else {
            toast.success(`تم حذف السجلات المعروضة (${deletedCount} نشاط) بنجاح`)
          }

          setLogs([])
          setUsersMap(new Map())
          await loadLogs()
        }
      } else {
        // حذف النشاطات المحددة
        const idsToDelete = Array.from(selectedLogIds)
        if (idsToDelete.length === 0) {
          toast.error('لم يتم تحديد أي نشاطات للحذف')
          setDeleting(false)
          return
        }

        if (deleteFromDatabase) {
          // حذف من قاعدة البيانات
          logger.debug(
            `[ActivityLogs] Starting delete of ${idsToDelete.length} selected logs from database`
          )

          // حذف بالدفعات إذا كان العدد كبير (أكثر من 1000)
          const batchSize = 1000
          let deletedCount = 0

          if (idsToDelete.length > batchSize) {
            for (let i = 0; i < idsToDelete.length; i += batchSize) {
              const batch = idsToDelete.slice(i, i + batchSize)
              logger.debug(
                `[ActivityLogs] Deleting batch ${Math.floor(i / batchSize) + 1}, IDs: ${batch.length}`
              )

              const { data, error } = await supabase
                .from('activity_log')
                .delete()
                .in('id', batch)
                .select()

              if (error) {
                console.error(`[ActivityLogs] Error deleting batch:`, error)
                throw error
              }

              const actualDeleted = data?.length || 0
              logger.debug(`[ActivityLogs] Batch deleted: ${actualDeleted} rows`)
              deletedCount += actualDeleted
            }
          } else {
            const { data, error } = await supabase
              .from('activity_log')
              .delete()
              .in('id', idsToDelete)
              .select()

            if (error) {
              console.error('[ActivityLogs] Error deleting logs:', error)
              throw error
            }

            deletedCount = data?.length || 0
            logger.debug(`[ActivityLogs] Deleted: ${deletedCount} rows`)
          }

          if (deletedCount === 0) {
            toast.error('فشل حذف النشاطات. قد تكون هناك مشكلة في الصلاحيات أو RLS policies')
            console.error(
              '[ActivityLogs] No rows were deleted. Check RLS policies for DELETE on activity_log table'
            )
          } else if (deletedCount < idsToDelete.length) {
            toast.warning(
              `تم حذف ${deletedCount} نشاط من ${idsToDelete.length} محدد من قاعدة البيانات`
            )
          } else {
            toast.success(`تم حذف ${deletedCount} نشاط من قاعدة البيانات بنجاح`)
          }

          // إعادة تحميل البيانات للتأكد من التحديث
          await loadLogs()
          setSelectedLogIds(new Set())
        } else {
          // حذف من العرض فقط - إزالة السجلات المحددة من state فقط
          logger.debug(
            `[ActivityLogs] Removing ${idsToDelete.length} selected logs from display only`
          )

          const updatedLogs = logs.filter((log) => !idsToDelete.includes(log.id))
          setLogs(updatedLogs)

          // إزالة المستخدمين الذين لم يعودوا موجودين في السجلات
          const remainingUserIds = new Set<string>()
          updatedLogs.forEach((log) => {
            if (log.user_id) {
              remainingUserIds.add(log.user_id)
            }
          })

          const updatedUsersMap = new Map<string, User>()
          remainingUserIds.forEach((userId) => {
            const user = usersMap.get(userId)
            if (user) {
              updatedUsersMap.set(userId, user)
            }
          })
          setUsersMap(updatedUsersMap)

          toast.success(`تم إزالة ${idsToDelete.length} نشاط من العرض`)
          setSelectedLogIds(new Set())
        }
      }

      setShowDeleteModal(false)
      setDeleteAllMode(false)
      setDeleteFromDatabase(false)
    } catch (error: unknown) {
      console.error('Error deleting logs:', error)
      toast.error((error instanceof Error ? error.message : String(error)) || 'فشل في حذف النشاطات')
    } finally {
      setDeleting(false)
    }
  }

  // Export to Excel
  const exportToExcel = useCallback(async () => {
    const data = filteredLogs.map((log) => {
      let userDisplay = 'النظام'
      if (log.user_id) {
        const user = usersMap.get(log.user_id)
        if (user) {
          userDisplay = `${user.full_name} (${user.username})`
        } else {
          userDisplay = String(log.user_id).slice(0, 8) + '...'
        }
      }
      return {
        العملية: getActionLabel(log.action),
        'نوع الكيان': log.entity_type ? getEntityLabel(log.entity_type) : '-',
        'معرف الكيان': log.entity_id || '-',
        المستخدم: userDisplay,
        'عنوان IP': log.ip_address || '-',
        'التاريخ والوقت': formatDateTimeWithHijri(log.created_at),
        التفاصيل: JSON.stringify(log.details || {}, null, 2),
      }
    })

    const XLSX = await loadXlsx()
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'سجل النشاطات')
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    saveAs(blob, `سجل_النشاطات_${new Date().toISOString().split('T')[0]}.xlsx`)
    toast.success('تم تصدير البيانات بنجاح')
  }, [filteredLogs, usersMap])

  const content = unauthorized ? (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <Activity className="w-16 h-16 mx-auto mb-4 text-danger-500" />
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">غير مصرح</h2>
        <p className="text-neutral-600">عذراً، ليس لديك صلاحية لعرض هذه الصفحة.</p>
      </div>
    </div>
  ) : (
    <div className="app-page app-tech-grid">
          {/* Header */}
          <div className="flex flex-col gap-3 mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="app-icon-chip flex-shrink-0">
                <Activity className="w-4 sm:w-5 h-4 sm:h-5 text-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-neutral-900">
                  سجل النشاطات
                </h1>
                <p className="text-xs text-neutral-600 mt-0 sm:mt-0.5">تتبع الإجراءات</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
              {isAdmin && selectedLogIds.size > 0 && (
                <Button
                  onClick={handleDeleteSelected}
                  size="sm"
                  variant="destructive"
                  className="text-xs"
                >
                  <Trash2 className="w-3 sm:w-4 h-3 sm:h-4" />
                  <span className="hidden sm:inline">حذف ({selectedLogIds.size})</span>
                  <span className="sm:hidden">حذف</span>
                </Button>
              )}
              {isAdmin && (
                <Button
                  onClick={handleDeleteAll}
                  size="sm"
                  variant="destructive"
                  className="text-xs"
                >
                  <Trash2 className="w-3 sm:w-4 h-3 sm:h-4" />
                  <span className="hidden sm:inline">حذف الكل</span>
                  <span className="sm:hidden">حذف</span>
                </Button>
              )}
              <Button onClick={loadLogs} size="sm" variant="secondary" className="text-xs">
                <RefreshCw className="w-3 sm:w-4 h-3 sm:h-4" />
                <span className="hidden sm:inline">تحديث</span>
              </Button>
              <Button onClick={exportToExcel} size="sm" className="text-xs">
                <Download className="w-3 sm:w-4 h-3 sm:h-4" />
                <span className="hidden sm:inline">Excel</span>
              </Button>
            </div>
          </div>

          {/* Statistics */}
          <StatsCards
            total={filteredLogs.length}
            createCount={createLogs.length}
            updateCount={updateLogs.length}
            deleteCount={deleteLogs.length}
            todayCount={todayLogs.length}
            weekCount={weekLogs.length}
            employeeCount={employeeLogs.length}
            companyCount={companyLogs.length}
          />

          {/* Filters */}
          <LogsFilters
            searchTerm={searchTerm}
            onSearchTermChange={(v) => setSearchTerm(v)}
            actionFilter={actionFilter}
            onActionFilterChange={(v) => setActionFilter(v as ActionFilter)}
            entityFilter={entityFilter}
            onEntityFilterChange={(v) => setEntityFilter(v as EntityFilter)}
            dateFilter={dateFilter}
            onDateFilterChange={(v) => setDateFilter(v as DateFilter)}
            hasActiveFilters={Boolean(
              searchTerm || actionFilter !== 'all' || entityFilter !== 'all' || dateFilter !== 'all'
            )}
            onReset={() => {
              setSearchTerm('')
              setActionFilter('all')
              setEntityFilter('all')
              setDateFilter('all')
              setCurrentPage(1)
            }}
          />

          <LogsTable
            loading={loading}
            isAdmin={isAdmin}
            paginatedLogs={paginatedLogs}
            filteredTotal={filteredLogs.length}
            startIndex={startIndex}
            endIndex={endIndex}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={(n) => {
              setItemsPerPage(n)
              setCurrentPage(1)
            }}
            currentPage={currentPage}
            totalPages={totalPages}
            setCurrentPage={(n) => setCurrentPage(n)}
            usersMap={usersMap}
            getActionColor={getActionColor}
            getActionIcon={getActionIcon}
            getActionLabel={getActionLabel}
            getEntityLabel={getEntityLabel}
            isImportantAction={isImportantAction}
            formatDateTimeWithHijri={formatDateTimeWithHijri}
            onRowClick={(log) => setSelectedLog(log)}
            selectedLogIds={selectedLogIds}
            allSelected={allSelected}
            someSelected={someSelected}
            handleSelectAll={handleSelectAll}
            handleSelectLog={handleSelectLog}
          />

          <DeleteConfirmModal
            open={showDeleteModal}
            deleteAllMode={deleteAllMode}
            deleteFromDatabase={deleteFromDatabase}
            setDeleteFromDatabase={setDeleteFromDatabase}
            deleting={deleting}
            confirmDelete={confirmDelete}
            onClose={() => {
              setShowDeleteModal(false)
              setDeleteAllMode(false)
              setDeleteFromDatabase(false)
            }}
            selectedCount={selectedLogIds.size}
            visibleCount={filteredLogs.length}
          />

          <LogDetailsModal
            open={Boolean(selectedLog)}
            log={selectedLog}
            usersMap={usersMap}
            onClose={() => setSelectedLog(null)}
            getActionColor={getActionColor}
            getActionIcon={getActionIcon}
            getActionLabel={getActionLabel}
            getEntityLabel={getEntityLabel}
            formatDateTimeWithHijri={formatDateTimeWithHijri}
            generateActivityDescription={generateActivityDescription}
          />

          {/* End of main container */}
        </div>
  )

  if (embedded) return content
  return <Layout>{content}</Layout>
}
