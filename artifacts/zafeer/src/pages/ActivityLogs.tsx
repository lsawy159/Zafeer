import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase, ActivityLog, User } from '@/lib/supabase'
import Layout from '@/components/layout/Layout'
import { useAuth } from '@/contexts/AuthContext'
import { logger } from '@/utils/logger'
import { securityLogger } from '@/utils/securityLogger'
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

type ActionFilterValue = 'create' | 'update' | 'delete' | 'login'
type EntityFilterValue = 'employee' | 'company' | 'user' | 'settings'
type ActionFilter = ActionFilterValue[]
type EntityFilter = EntityFilterValue[]
type DateFilter = 'all' | 'today' | 'week' | 'month'
type ActivitySortField = 'created_at' | 'action' | 'entity_type'
type SortDirection = 'asc' | 'desc'
type ActivityLogUser = Pick<User, 'id' | 'email' | 'full_name' | 'username'>

function getLocalMidnight(daysAgo = 0): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  if (daysAgo) d.setDate(d.getDate() - daysAgo)
  return d
}

function compareActivityLogs(
  left: ActivityLog,
  right: ActivityLog,
  sortField: ActivitySortField,
  sortDirection: SortDirection
) {
  const directionFactor = sortDirection === 'asc' ? 1 : -1

  if (sortField === 'created_at') {
    const leftCreatedAt = left.created_at ? new Date(left.created_at).getTime() : null
    const rightCreatedAt = right.created_at ? new Date(right.created_at).getTime() : null

    if (leftCreatedAt === null && rightCreatedAt === null) return 0
    if (leftCreatedAt === null) return 1
    if (rightCreatedAt === null) return -1
    if (leftCreatedAt === rightCreatedAt) return 0

    return (leftCreatedAt - rightCreatedAt) * directionFactor
  }

  const leftValue = (sortField === 'action' ? left.action : left.entity_type ?? '').trim()
  const rightValue = (sortField === 'action' ? right.action : right.entity_type ?? '').trim()

  if (!leftValue && !rightValue) return 0
  if (!leftValue) return 1
  if (!rightValue) return -1

  return leftValue.localeCompare(rightValue, 'ar', { sensitivity: 'base' }) * directionFactor
}

function matchesActionFilter(action: string, filters: ActionFilter) {
  if (filters.length === 0) return true

  const actionLower = action.toLowerCase()

  return filters.some((filter) => {
    const filterLower = filter.toLowerCase()
    return (
      actionLower === filterLower ||
      actionLower.includes(filterLower) ||
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
        (actionLower.includes('delete') || actionLower.includes('remove') || actionLower.includes('حذف'))) ||
      (filterLower === 'login' &&
        (actionLower.includes('login') ||
          actionLower.includes('logout') ||
          actionLower.includes('دخول') ||
          actionLower.includes('خروج')))
    )
  })
}

function matchesEntityFilter(entityType: string | undefined, filters: EntityFilter) {
  if (filters.length === 0) return true
  const entityTypeLower = entityType?.toLowerCase() ?? ''
  return filters.includes(entityTypeLower as EntityFilterValue)
}

export default function ActivityLogs({ embedded = false }: { embedded?: boolean } = {}) {
  const { user } = useAuth()
  const { canView } = usePermissions()
  const isAdmin = user?.role === 'admin'

  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [totalDbCount, setTotalDbCount] = useState<number | null>(null)
  const [usersMap, setUsersMap] = useState<Map<string, ActivityLogUser>>(new Map())
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState<ActionFilter>([])
  const [entityFilter, setEntityFilter] = useState<EntityFilter>([])
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [sortField, setSortField] = useState<ActivitySortField>('created_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null)
  const [selectedLogIds, setSelectedLogIds] = useState<Set<number>>(new Set())
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteAllMode, setDeleteAllMode] = useState(false)
  const [deleteFromDatabase, setDeleteFromDatabase] = useState(false)
  const [deleteConfirmWord, setDeleteConfirmWord] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  useEffect(() => {
    loadLogs()
  }, [])

  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300)

  // Reset page + clear selection when filters change
  useEffect(() => {
    setCurrentPage(1)
    setSelectedLogIds(new Set())
  }, [debouncedSearchTerm, actionFilter, entityFilter, dateFilter, sortField, sortDirection])

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

  const unauthorized = !canView('activityLogs')

  async function loadLogs() {
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

      // عدد السجلات الكلي في قاعدة البيانات (بدون limit)
      const { count } = await supabase
        .from('activity_log')
        .select('id', { count: 'exact', head: true })
      if (count != null) setTotalDbCount(count)

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
          const users = new Map<string, ActivityLogUser>()
          usersData.forEach((u) => {
            users.set(u.id, {
              id: u.id,
              username: u.username || u.email.split('@')[0],
              email: u.email,
              full_name: u.full_name,
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
        if (debouncedSearchTerm) {
          const search = debouncedSearchTerm.toLowerCase()
          const matchesAction = log.action.toLowerCase().includes(search)
          const matchesEntity = log.entity_type?.toLowerCase().includes(search)
          const matchesDetails = JSON.stringify(log.details).toLowerCase().includes(search)
          if (!matchesAction && !matchesEntity && !matchesDetails) return false
        }

        if (!matchesActionFilter(log.action, actionFilter)) return false
        if (!matchesEntityFilter(log.entity_type, entityFilter)) return false

        if (dateFilter !== 'all') {
          if (dateFilter === 'today') {
            if (new Date(log.created_at) < getLocalMidnight()) return false
          }

          if (dateFilter === 'week') {
            if (new Date(log.created_at) < getLocalMidnight(7)) return false
          }

          if (dateFilter === 'month') {
            if (new Date(log.created_at) < getLocalMidnight(30)) return false
          }
        }

        return true
      }).sort((left, right) => compareActivityLogs(left, right, sortField, sortDirection)),
    [logs, debouncedSearchTerm, actionFilter, entityFilter, dateFilter, sortField, sortDirection]
  )

  const todayLogs = useMemo(() => {
    const midnight = getLocalMidnight()
    return filteredLogs.filter((log) => new Date(log.created_at) >= midnight)
  }, [filteredLogs])

  const weekLogs = useMemo(() => {
    const weekAgo = getLocalMidnight(7)
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

  const filteredTotal = filteredLogs.length
  const computedTotalPages = Math.ceil(filteredTotal / itemsPerPage)

  // Clamp currentPage when filtered results shrink
  useEffect(() => {
    if (computedTotalPages > 0 && currentPage > computedTotalPages) {
      setCurrentPage(computedTotalPages)
    }
  }, [computedTotalPages, currentPage])

  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, filteredTotal)
  const paginatedLogs = useMemo(
    () => filteredLogs.slice(startIndex, endIndex),
    [filteredLogs, startIndex, endIndex]
  )

  const allSelected =
    paginatedLogs.length > 0 && paginatedLogs.every((log) => selectedLogIds.has(log.id))
  const someSelected = paginatedLogs.some((log) => selectedLogIds.has(log.id)) && !allSelected

  const handleSelectAll = useCallback(() => {
    const pageSlice = filteredLogs.slice(startIndex, endIndex)
    if (
      selectedLogIds.size === pageSlice.length &&
      pageSlice.every((log) => selectedLogIds.has(log.id))
    ) {
      const newSelected = new Set(selectedLogIds)
      pageSlice.forEach((log) => newSelected.delete(log.id))
      setSelectedLogIds(newSelected)
    } else {
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
    setDeleteFromDatabase(false)
    setDeleteConfirmWord('')
    setShowDeleteModal(true)
  }, [selectedLogIds])

  const handleDeleteAll = useCallback(() => {
    if (filteredLogs.length === 0) {
      toast.error('لا توجد نشاطات للحذف')
      return
    }
    setDeleteAllMode(true)
    setDeleteFromDatabase(false)
    setDeleteConfirmWord('')
    setShowDeleteModal(true)
  }, [filteredLogs])

  const deleteAllFromDatabase = async (): Promise<number> => {
    let totalDeleted = 0
    const batchSize = 500
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
          logger.debug('[ActivityLogs] Starting delete of ALL logs from database')

          const totalDeleted = await deleteAllFromDatabase()

          if (totalDeleted === 0) {
            toast.error('فشل حذف النشاطات. قد تكون هناك مشكلة في الصلاحيات أو RLS policies')
            console.error(
              '[ActivityLogs] No rows were deleted. Check RLS policies for DELETE on activity_log table'
            )
          } else {
            toast.success(`تم حذف جميع النشاطات من قاعدة البيانات (${totalDeleted} نشاط) بنجاح`)
            // مساءلة: مسح السجل حدث أمني يُكتب في security_events (يبقى أثر حتى لو اتمسح activity_log)
            void securityLogger.logSecurityEvent('activity_log_deleted', `تم حذف كل سجل النشاطات (${totalDeleted} سطر) من قاعدة البيانات`, 'high', { count: totalDeleted, mode: 'all' })
          }

          setLogs([])
          setUsersMap(new Map())
          await loadLogs()
        } else {
          // حذف السجلات المفلترة المعروضة فقط — وليس جميع logs
          const allIds = filteredLogs.map((log) => log.id)

          if (allIds.length === 0) {
            toast.info('لا توجد نشاطات للحذف')
            setDeleting(false)
            return
          }

          logger.debug(`[ActivityLogs] Starting delete of ${allIds.length} filtered logs`)

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
            void securityLogger.logSecurityEvent('activity_log_deleted', `تم حذف ${deletedCount} سطر من سجل النشاطات (المعروض)`, 'high', { count: deletedCount, mode: 'filtered' })
          }

          setLogs([])
          setUsersMap(new Map())
          await loadLogs()
        }
      } else {
        const idsToDelete = Array.from(selectedLogIds)
        if (idsToDelete.length === 0) {
          toast.error('لم يتم تحديد أي نشاطات للحذف')
          setDeleting(false)
          return
        }

        if (deleteFromDatabase) {
          logger.debug(
            `[ActivityLogs] Starting delete of ${idsToDelete.length} selected logs from database`
          )

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
            void securityLogger.logSecurityEvent('activity_log_deleted', `تم حذف ${deletedCount} سطر محدد من سجل النشاطات`, 'high', { count: deletedCount, mode: 'selected' })
          }

          await loadLogs()
          setSelectedLogIds(new Set())
        } else {
          logger.debug(
            `[ActivityLogs] Removing ${idsToDelete.length} selected logs from display only`
          )

          const updatedLogs = logs.filter((log) => !idsToDelete.includes(log.id))
          setLogs(updatedLogs)

          const remainingUserIds = new Set<string>()
          updatedLogs.forEach((log) => {
            if (log.user_id) {
              remainingUserIds.add(log.user_id)
            }
          })

          const updatedUsersMap = new Map<string, ActivityLogUser>()
          remainingUserIds.forEach((userId) => {
            const u = usersMap.get(userId)
            if (u) {
              updatedUsersMap.set(userId, u)
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
      setDeleteConfirmWord('')
    } catch (error: unknown) {
      console.error('Error deleting logs:', error)
      toast.error((error instanceof Error ? error.message : String(error)) || 'فشل في حذف النشاطات')
    } finally {
      setDeleting(false)
    }
  }

  const exportToExcel = useCallback(async () => {
    if (totalDbCount != null && totalDbCount > logs.length) {
      toast.warning(
        `التصدير يشمل ${filteredLogs.length} سجل فقط (المعروض). قاعدة البيانات تحتوي ${totalDbCount.toLocaleString('ar-SA')} سجل إجمالاً.`
      )
    }

    const data = filteredLogs.map((log) => {
      let userDisplay = 'النظام'
      if (log.user_id) {
        const u = usersMap.get(log.user_id)
        if (u) {
          userDisplay = `${u.full_name} (${u.username})`
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
  }, [filteredLogs, usersMap, logs.length, totalDbCount])

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
                <p className="text-xs text-neutral-600 mt-0 sm:mt-0.5">
                  تتبع الإجراءات
                  {totalDbCount != null && totalDbCount > logs.length && (
                    <span className="text-orange-600 mr-1">
                      — أحدث {logs.length.toLocaleString('ar-SA')} من {totalDbCount.toLocaleString('ar-SA')} إجمالاً
                    </span>
                  )}
                </p>
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
            onActionFilterChange={(v) => setActionFilter(v)}
            entityFilter={entityFilter}
            onEntityFilterChange={(v) => setEntityFilter(v)}
            dateFilter={dateFilter}
            onDateFilterChange={(v) => setDateFilter(v as DateFilter)}
            sortField={sortField}
            onSortFieldChange={(v) => setSortField(v as ActivitySortField)}
            sortDirection={sortDirection}
            onSortDirectionChange={(v) => setSortDirection(v as SortDirection)}
            hasActiveFilters={Boolean(
              searchTerm ||
                actionFilter.length > 0 ||
                entityFilter.length > 0 ||
                dateFilter !== 'all' ||
                sortField !== 'created_at' ||
                sortDirection !== 'desc'
            )}
            onReset={() => {
              setSearchTerm('')
              setActionFilter([])
              setEntityFilter([])
              setDateFilter('all')
              setSortField('created_at')
              setSortDirection('desc')
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
            totalPages={computedTotalPages}
            setCurrentPage={(n) => setCurrentPage(n)}
            usersMap={usersMap as Map<string, User>}
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
            deleteConfirmWord={deleteConfirmWord}
            setDeleteConfirmWord={setDeleteConfirmWord}
            totalDbCount={totalDbCount}
            deleting={deleting}
            confirmDelete={confirmDelete}
            onClose={() => {
              setShowDeleteModal(false)
              setDeleteAllMode(false)
              setDeleteFromDatabase(false)
              setDeleteConfirmWord('')
            }}
            selectedCount={selectedLogIds.size}
            visibleCount={filteredLogs.length}
          />

          <LogDetailsModal
            open={Boolean(selectedLog)}
            log={selectedLog}
            usersMap={usersMap as Map<string, User>}
            onClose={() => setSelectedLog(null)}
            getActionColor={getActionColor}
            getActionIcon={getActionIcon}
            getActionLabel={getActionLabel}
            getEntityLabel={getEntityLabel}
            formatDateTimeWithHijri={formatDateTimeWithHijri}
            generateActivityDescription={generateActivityDescription}
          />

        </div>
  )

  if (embedded) return content
  return <Layout>{content}</Layout>
}
