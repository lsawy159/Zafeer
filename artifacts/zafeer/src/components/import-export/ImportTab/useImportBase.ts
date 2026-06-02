import { useState, useRef, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'
import { loadXlsx } from '@/utils/lazyXlsx'
import { parseDate, normalizeDate } from '@/utils/dateParser'
import { validateUnifiedNumber, validateLaborSubscription } from '@/utils/companyNumberValidation'
import {
  HIRED_WORKER_CONTRACT_STATUS_OPTIONS,
  buildEmployeeBusinessAdditionalFields,
} from '@/utils/employeeBusinessFields'
import {
  ValidationError,
  ImportResult,
  EMPLOYEE_COLUMNS_ORDER,
  COMPANY_COLUMNS_ORDER,
} from './importTypes'

interface ImportBaseProps {
  initialImportType?: 'employees' | 'companies'
  onImportSuccess?: () => void
  isInModal?: boolean
  hideTypeSelector?: boolean
}

export function useImportBase({
  initialImportType = 'employees',
  onImportSuccess,
  isInModal = false,
  hideTypeSelector = false,
}: ImportBaseProps = {}) {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [validating, setValidating] = useState(false)
  const [validationResults, setValidationResults] = useState<ValidationError[]>([])
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([])
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importType, setImportType] = useState<'employees' | 'companies'>(initialImportType)
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 200
  const [columnValidationError, setColumnValidationError] = useState<{
    missing: string[]
    extra: string[]
  } | null>(null)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [shouldDeleteBeforeImport, setShouldDeleteBeforeImport] = useState(false)
  const [deleteMode, setDeleteMode] = useState<'all' | 'matching'>('all')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingImport, setPendingImport] = useState<(() => void) | null>(null)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 })
  const [isDeleting, setIsDeleting] = useState(false)
  const [isImportCancelled, setIsImportCancelled] = useState(false)
  const [conflictResolution, setConflictResolution] = useState<Map<number, 'keep' | 'replace'>>(
    new Map()
  )
  const [dbConflicts, setDbConflicts] = useState<Set<number>>(new Set())
  const [, setImportedIds] = useState<{ employees: string[]; companies: string[] }>({
    employees: [],
    companies: [],
  })
  const importedIdsRef = useRef<{ employees: string[]; companies: string[] }>({
    employees: [],
    companies: [],
  })
  const cancelImportRef = useRef(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [validationFilter, setValidationFilter] = useState<'all' | 'errors' | 'warnings'>('all')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        toast.error('يرجى اختيار ملف Excel فقط (.xlsx, .xls)')
        return
      }
      setFile(selectedFile)
      setValidationResults([])
      setPreviewData([])
      setImportResult(null)
      setCurrentPage(1)
      setColumnValidationError(null)
      setSelectedRows(new Set())
      setShouldDeleteBeforeImport(false)
      setValidationFilter('all')
      setConflictResolution(new Map())
      setDbConflicts(new Set())
    }
  }

  const handleCancel = () => {
    setFile(null)
    setValidationResults([])
    setPreviewData([])
    setImportResult(null)
    setCurrentPage(1)
    setColumnValidationError(null)
    setSelectedRows(new Set())
    setShouldDeleteBeforeImport(false)
    setValidationFilter('all')
    setConflictResolution(new Map())
    setDbConflicts(new Set())
    // إعادة تعيين input file
    const fileInput = document.getElementById('file-upload') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      setFile(droppedFile)
      setValidationResults([])
      setPreviewData([])
      setImportResult(null)
      setCurrentPage(1)
      setColumnValidationError(null)
      setSelectedRows(new Set())
      setShouldDeleteBeforeImport(false)
      setValidationFilter('all')
      setConflictResolution(new Map())
      setDbConflicts(new Set())
    } else {
      toast.error('يرجى إسقاط ملف Excel فقط (.xlsx, .xls)')
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  // Helper function to check if a cell value is empty
  const isCellEmpty = (value: unknown): boolean => {
    if (value === null || value === undefined) return true
    if (typeof value === 'string' && value.trim() === '') return true
    if (typeof value === 'number' && isNaN(value)) return true
    return false
  }

  // Helper function to get errors for a specific cell
  const getCellErrors = (rowIndex: number, fieldName: string): ValidationError[] => {
    const excelRowNumber = rowIndex + 2 // Excel row number (1 is header, +1 for index)
    return validationResults.filter(
      (error) => error.row === excelRowNumber && error.field === fieldName
    )
  }

  // Helper functions for row selection and visibility
  const toggleRowSelection = (rowIndex: number) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(rowIndex)) {
        newSet.delete(rowIndex)
      } else {
        newSet.add(rowIndex)
      }
      return newSet
    })
  }

  const getRowIssues = useCallback(
    (rowIndex: number) => {
      const excelRowNumber = rowIndex + 2
      const rowValidation = validationResults.filter((error) => error.row === excelRowNumber)
      const hasError = rowValidation.some((error) => error.severity === 'error')
      const hasWarning = rowValidation.some((error) => error.severity === 'warning')
      return { hasError, hasWarning, rowValidation }
    },
    [validationResults]
  )

  const getVisibleRowIndices = () => {
    return previewData
      .map((_, index) => index)
      .filter((index) => {
        const { hasError, hasWarning } = getRowIssues(index)
        if (validationFilter === 'errors') return hasError
        if (validationFilter === 'warnings') return !hasError && hasWarning
        return true
      })
  }

  const toggleSelectAll = useCallback(() => {
    const visibleIndices = previewData
      .map((_, index) => index)
      .filter((index) => {
        const { hasError, hasWarning } = getRowIssues(index)
        if (validationFilter === 'errors') return hasError
        if (validationFilter === 'warnings') return !hasError && hasWarning
        return true
      })
    setSelectedRows((prev) => {
      const newSet = new Set(prev)
      const allVisibleSelected =
        visibleIndices.length > 0 && visibleIndices.every((index) => newSet.has(index))
      if (allVisibleSelected) {
        visibleIndices.forEach((index) => newSet.delete(index))
      } else {
        visibleIndices.forEach((index) => newSet.add(index))
      }
      return newSet
    })
  }, [previewData, validationFilter, getRowIssues])

  const updateConflictChoice = useCallback((rowIndex: number, choice: 'keep' | 'replace') => {
    setConflictResolution((prev) => {
      const next = new Map(prev)
      next.set(rowIndex, choice)
      return next
    })
  }, [])

  const visibleRowIndices = getVisibleRowIndices()
  const isAllSelected =
    visibleRowIndices.length > 0 && visibleRowIndices.every((index) => selectedRows.has(index))
  const isSomeSelected =
    visibleRowIndices.some((index) => selectedRows.has(index)) && !isAllSelected

  // Helper function to normalize column names (remove extra spaces and invisible characters)
  const normalizeColumnName = (col: string): string => {
    if (!col) return ''
    // إزالة جميع المسافات والرموز غير المرئية
    return col
      .toString()
      .trim()
      .replace(/\s+/g, ' ') // استبدال المسافات المتعددة بمسافة واحدة
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // إزالة رموز Unicode غير المرئية
      .replace(/[\u00A0]/g, ' ') // استبدال non-breaking space بمسافة عادية
      .replace(/[\u2009-\u200F]/g, '') // إزالة مسافات Unicode أخرى
      .trim()
  }

  // Helper function to compare columns (more flexible comparison)
  const columnsMatch = (col1: string, col2: string): boolean => {
    if (!col1 || !col2) return false
    const normalized1 = normalizeColumnName(col1)
    const normalized2 = normalizeColumnName(col2)
    // مقارنة مباشرة
    if (normalized1 === normalized2) return true
    // مقارنة بدون مسافات (في حالة وجود مسافات إضافية)
    const noSpaces1 = normalized1.replace(/\s/g, '')
    const noSpaces2 = normalized2.replace(/\s/g, '')
    return noSpaces1 === noSpaces2
  }

  // Helper function to validate Excel columns against required columns
  const validateExcelColumns = (
    excelColumns: string[]
  ): { isValid: boolean; missing: string[]; extra: string[] } => {
    // تطبيع أسماء الأعمدة من Excel
    const normalizedExcelColumns = excelColumns.map((col) => normalizeColumnName(col))

    if (importType === 'employees') {
      const missing: string[] = []
      const extra: string[] = []

      // التحقق من الأعمدة المطلوبة
      EMPLOYEE_COLUMNS_ORDER.forEach((requiredCol) => {
        const normalizedRequired = normalizeColumnName(requiredCol)
        if (!normalizedExcelColumns.includes(normalizedRequired)) {
          missing.push(requiredCol)
        }
      })

      // التحقق من الأعمدة الإضافية
      normalizedExcelColumns.forEach((excelCol, index) => {
        const normalizedRequired = EMPLOYEE_COLUMNS_ORDER.map((c) => normalizeColumnName(c))
        if (!normalizedRequired.includes(excelCol)) {
          extra.push(excelColumns[index]) // استخدام الاسم الأصلي
        }
      })

      return {
        isValid: missing.length === 0,
        missing,
        extra,
      }
    } else {
      // للمؤسسات، التحقق من الأعمدة المطلوبة مثل الموظفين
      const missing: string[] = []
      const extra: string[] = []

      // قائمة الأعمدة التي يجب تجاهلها (تم استبدالها)
      const excludedColumns = [
        'رقم اشتراك التأمينات للشركات',
        'رقم اشتراك التامينات للشركات',
        'اشتراك التأمينات للشركات',
        'اشتراك التامينات للشركات',
      ].map((c) => normalizeColumnName(c))

      // التحقق من الأعمدة المطلوبة
      COMPANY_COLUMNS_ORDER.forEach((requiredCol) => {
        const normalizedRequired = normalizeColumnName(requiredCol)
        // البحث عن تطابق في الأعمدة المطبعة
        const found = normalizedExcelColumns.some((excelCol) =>
          columnsMatch(excelCol, normalizedRequired)
        )
        if (!found) {
          // محاولة أخرى: البحث بدون تطبيع (مباشرة)
          const directMatch = excelColumns.some((excelCol) => columnsMatch(excelCol, requiredCol))
          if (!directMatch) {
            missing.push(requiredCol)
            logger.debug(
              `❌ Missing column: "${requiredCol}" (normalized: "${normalizedRequired}")`
            )
            logger.debug(`   Available columns:`, excelColumns)
            logger.debug(`   Normalized available:`, normalizedExcelColumns)
          }
        }
      })

      // التحقق من الأعمدة الإضافية (مع تجاهل الأعمدة المستبعدة)
      normalizedExcelColumns.forEach((excelCol, index) => {
        const isExcluded = excludedColumns.some(
          (excluded) => excelCol.includes(excluded) || excluded.includes(excelCol)
        )
        const normalizedRequired = COMPANY_COLUMNS_ORDER.map((c) => normalizeColumnName(c))
        if (!normalizedRequired.includes(excelCol) && !isExcluded) {
          extra.push(excelColumns[index]) // استخدام الاسم الأصلي
        }
      })

      return {
        // ❌ رفض الملف إذا كان هناك أعمدة مفقودة أو أعمدة إضافية
        isValid: missing.length === 0 && extra.length === 0,
        missing,
        extra,
      }
    }
  }

  // Helper function to get ordered columns based on predefined order
  const getOrderedColumns = (
    dataColumns: string[],
    allData?: Record<string, unknown>[]
  ): string[] => {
    if (importType === 'employees') {
      // ترتيب الأعمدة حسب EMPLOYEE_COLUMNS_ORDER - عرض الأعمدة المطلوبة فقط
      const ordered: string[] = []
      // الأعمدة التي نريد إخفاءها من العرض (لأنها طويلة أو غير ضرورية للعرض)
      const hiddenColumnNames = ['الشركة أو المؤسسة']

      // دالة للتحقق من أن العمود مخفي
      const isColumnHidden = (columnName: string): boolean => {
        const normalized = normalizeColumnName(columnName)
        // إخفاء أي عمود يحتوي على "صورة" و "إقامة"
        if (normalized.includes('صورة') && normalized.includes('إقامة')) {
          return true
        }
        // إخفاء الأعمدة المحددة
        return hiddenColumnNames.some((hidden) => {
          const normalizedHidden = normalizeColumnName(hidden)
          return columnName === hidden || normalized === normalizedHidden
        })
      }

      // إضافة الأعمدة المطلوبة بالترتيب المحدد فقط (باستثناء المخفية)
      EMPLOYEE_COLUMNS_ORDER.forEach((col) => {
        // التحقق من أن العمود موجود في البيانات
        const existsInData =
          dataColumns.includes(col) ||
          dataColumns.some((dc) => normalizeColumnName(dc) === normalizeColumnName(col))

        // التحقق من أن العمود غير مخفي
        const isHidden = isColumnHidden(col)

        if (existsInData && !isHidden) {
          // إضافة الاسم من البيانات الفعلية
          const actualName =
            dataColumns.find(
              (dc) => dc === col || normalizeColumnName(dc) === normalizeColumnName(col)
            ) || col

          if (!isColumnHidden(actualName)) {
            ordered.push(actualName)
          }
        }
      })

      // التأكد من إزالة أي أعمدة مخفية قد تكون تبقيت
      return ordered.filter((col) => !isColumnHidden(col))

      // إرجاع الأعمدة المطلوبة فقط، بدون أي أعمدة إضافية
      return ordered
    } else {
      // للمؤسسات، نبدأ بالأعمدة المتوقعة ثم نضيف أي أعمدة إضافية
      const ordered: string[] = []
      const allColumnsSet = new Set<string>()

      // قائمة الأعمدة التي يجب تجاهلها (تم استبدالها)
      const excludedColumns = [
        'رقم اشتراك التأمينات للشركات',
        'رقم اشتراك التامينات للشركات',
        'اشتراك التأمينات للشركات',
        'اشتراك التامينات للشركات',
      ]

      // دالة للتحقق من أن العمود يجب تجاهله
      const shouldExcludeColumn = (columnName: string): boolean => {
        return excludedColumns.some(
          (excluded) => columnName.includes(excluded) || excluded.includes(columnName)
        )
      }

      // أولاً: إضافة جميع الأعمدة المتوقعة بالترتيب المحدد
      COMPANY_COLUMNS_ORDER.forEach((col) => {
        ordered.push(col)
        allColumnsSet.add(col)
      })

      // ثانياً: جمع جميع الأعمدة الإضافية من البيانات (إن وجدت) مع تجاهل الأعمدة المستبعدة
      if (allData && allData.length > 0) {
        allData.forEach((row) => {
          Object.keys(row).forEach((key) => {
            if (!allColumnsSet.has(key) && !shouldExcludeColumn(key)) {
              allColumnsSet.add(key)
              ordered.push(key)
            }
          })
        })
      } else if (dataColumns) {
        // إذا لم يتم توفير البيانات، نستخدم الأعمدة من الصف الأول
        dataColumns.forEach((key) => {
          if (!allColumnsSet.has(key) && !shouldExcludeColumn(key)) {
            allColumnsSet.add(key)
            ordered.push(key)
          }
        })
      }

      return ordered
    }
  }

  const validateData = async () => {
    if (!file) return

    setValidating(true)
    const errors: ValidationError[] = []

    try {
      const XLSX = await loadXlsx()
      // إنشاء نسخة من الملف لتجنب مشكلة NotReadableError
      let data: ArrayBuffer
      try {
        data = await file.arrayBuffer()
      } catch (error) {
        // إذا فشلت القراءة، حاول قراءة الملف مرة أخرى
        console.warn('First read attempt failed, retrying...', error)
        // إعادة تعيين الملف
        const fileInput = document.getElementById('file-upload') as HTMLInputElement
        if (fileInput && fileInput.files && fileInput.files[0]) {
          data = await fileInput.files[0].arrayBuffer()
        } else {
          throw new Error('لا يمكن قراءة الملف. يرجى المحاولة مرة أخرى.')
        }
      }

      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]

      // قراءة الأعمدة من header row مباشرة (للتأكد من قراءة جميع الأعمدة حتى الفارغة)
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
      const excelColumns: string[] = []

      // قراءة الأعمدة من الصف الأول (header row)
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
        const cell = worksheet[cellAddress]
        if (cell) {
          const cellValue = cell.v !== undefined && cell.v !== null ? String(cell.v).trim() : ''
          if (cellValue) {
            excelColumns.push(cellValue)
          }
        }
      }

      // تحديد أعمدة التواريخ
      const dateColumns = [
        'تاريخ الميلاد',
        'تاريخ الالتحاق',
        'تاريخ انتهاء الإقامة',
        'تاريخ انتهاء العقد',
        'تاريخ انتهاء عقد أجير',
        'تاريخ انتهاء التأمين الصحي',
      ]

      // الحصول على indices الأعمدة للتواريخ بناءً على excelColumns
      const dateColumnIndices: { [key: string]: number } = {}
      excelColumns.forEach((col, index) => {
        if (dateColumns.includes(col)) {
          dateColumnIndices[col] = index
        }
      })

      // دالة لقراءة التاريخ من خلية Excel بشكل صحيح
      const readDateFromCell = (
        cell: { w?: string; t?: string; v?: unknown } | undefined
      ): string => {
        if (!cell) return ''

        // إذا كان هناك نص منسق (cell.w)، استخدمه مباشرة - هذا هو النص المعروض في Excel
        if (cell.w) {
          const formattedText = String(cell.w).trim()
          // التحقق من أن النص ليس فارغاً أو مساوياً لقيمة افتراضية
          if (formattedText && formattedText !== '#N/A' && formattedText !== '#VALUE!') {
            return formattedText
          }
        }

        // إذا كانت القيمة رقم تسلسلي (Excel date serial number)
        if (cell.t === 'n' && typeof cell.v === 'number') {
          // التحقق من أن الرقم ضمن نطاق تاريخ Excel المعقول
          if (cell.v > 0 && cell.v < 1000000) {
            try {
              // تحويل الرقم التسلسلي إلى تاريخ
              const excelEpoch = new Date(1900, 0, 1)
              const days = Math.floor(cell.v) - 2 // Excel incorrectly treats 1900 as leap year
              const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000)

              // التحقق من أن التاريخ صحيح
              if (!isNaN(date.getTime())) {
                const year = date.getFullYear()
                // التحقق من أن السنة منطقية (بين 1900 و 2100)
                if (year >= 1900 && year <= 2100) {
                  // تنسيق التاريخ بصيغة DD-Mon-YYYY
                  const day = String(date.getDate()).padStart(2, '0')
                  const monthNames = [
                    'Jan',
                    'Feb',
                    'Mar',
                    'Apr',
                    'May',
                    'Jun',
                    'Jul',
                    'Aug',
                    'Sep',
                    'Oct',
                    'Nov',
                    'Dec',
                  ]
                  const month = monthNames[date.getMonth()]
                  return `${day}-${month}-${year}`
                }
              }
            } catch (e) {
              console.warn('Error converting Excel serial date:', e, 'value:', cell.v)
            }
          }
        }

        // إذا كانت القيمة نص، استخدمها مباشرة
        if (cell.v !== undefined && cell.v !== null) {
          const strValue = String(cell.v).trim()
          if (strValue && strValue !== 'null' && strValue !== 'undefined') {
            return strValue
          }
        }

        return ''
      }

      // قراءة البيانات
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: '', // قيمة افتراضية للأعمدة الفارغة
        raw: false, // تحويل القيم إلى strings
      })

      // معالجة التواريخ من الخلايا مباشرة للحصول على القيم الصحيحة
      jsonData.forEach((row: Record<string, unknown>, rowIndex: number) => {
        // rowIndex + 1 لأن الصف الأول (0) في Excel هو header row
        const excelRowIndex = rowIndex + 1

        // معالجة كل عمود تاريخ
        dateColumns.forEach((colName) => {
          const colIndex = dateColumnIndices[colName]
          if (colIndex !== undefined && colIndex !== -1) {
            // الحصول على عنوان الخلية (مثل A2, B3, إلخ)
            const cellAddress = XLSX.utils.encode_cell({ r: excelRowIndex, c: colIndex })
            const cell = worksheet[cellAddress]

            if (cell) {
              // قراءة التاريخ من الخلية مباشرة
              const dateValue = readDateFromCell(cell)
              if (dateValue) {
                // استبدال القيمة في jsonData بالقيمة الصحيحة من الخلية
                row[colName] = dateValue
                // Debug: طباعة التواريخ التي تم قراءتها بنجاح (معطل لتقليل الضوضاء)
                // if (rowIndex < 3) {
                //   logger.debug(`  ✅ Row ${rowIndex + 2}, Column "${colName}": Successfully read "${dateValue}" from cell ${cellAddress}`)
                // }
              } else {
                // إذا فشلت قراءة الخلية، احتفظ بالقيمة من jsonData بعد تنظيفها
                const fallbackValue = row[colName] ? String(row[colName] || '').trim() : ''
                row[colName] = fallbackValue
                // Debug: طباعة التواريخ التي فشلت قراءتها (معطل لتقليل الضوضاء)
                // if (rowIndex < 3 && fallbackValue) {
                //   logger.debug(`  ⚠️ Row ${rowIndex + 2}, Column "${colName}": Using fallback value "${fallbackValue}" (readDateFromCell returned empty)`)
                // }
              }
            } else if (row[colName]) {
              // إذا لم تكن هناك خلية، احتفظ بالقيمة من jsonData
              row[colName] = String(row[colName] || '').trim()
              // Debug: طباعة التواريخ التي لم تكن هناك خلية لها (معطل لتقليل الضوضاء)
              // if (rowIndex < 3) {
              //   logger.debug(`  📝 Row ${rowIndex + 2}, Column "${colName}": No cell found, using jsonData value "${row[colName]}"`)
              // }
            } else {
              row[colName] = ''
            }
          }
        })
      })

      // Debug: طباعة عينة من التواريخ للتحقق (معطل لتقليل الضوضاء)
      // if (jsonData.length > 0) {
      //   logger.debug('🔍 Sample dates from first 3 rows after readDateFromCell:')
      //   for (let i = 0; i < Math.min(3, jsonData.length); i++) {
      //     logger.debug(`  Row ${i + 1}:`)
      //     dateColumns.forEach(col => {
      //       const value = jsonData[i][col]
      //       if (value) {
      //         logger.debug(`    ${col}: "${value}" (type: ${typeof value})`)
      //       } else {
      //         logger.debug(`    ${col}: (empty)`)
      //       }
      //     })
      //   }
      // }

      // Debug: طباعة الأعمدة للتحقق (معطل لتقليل الضوضاء)
      // logger.debug('🔍 Excel Columns (from header):', excelColumns)
      // logger.debug('🔍 Excel Columns (from jsonData):', jsonData.length > 0 ? Object.keys(jsonData[0]) : [])
      // logger.debug('🔍 Required Columns:', importType === 'companies' ? COMPANY_COLUMNS_ORDER : EMPLOYEE_COLUMNS_ORDER)

      // التحقق من تطابق الأعمدة
      if (excelColumns.length > 0) {
        const columnValidation = validateExcelColumns(excelColumns)

        // Debug: طباعة نتائج التحقق (معطل لتقليل الضوضاء)
        // logger.debug('🔍 Validation Result:', columnValidation)

        if (!columnValidation.isValid) {
          // إضافة خطأ عام يمنع الاستيراد
          errors.push({
            row: 0,
            field: 'الأعمدة',
            message: `الأعمدة في ملف Excel لا تطابق الأعمدة المطلوبة. الأعمدة المفقودة: ${columnValidation.missing.join(', ')}`,
            severity: 'error',
          })

          setValidationResults(errors)
          setPreviewData([]) // عدم عرض البيانات حتى يتم إصلاح الأعمدة
          setColumnValidationError({
            missing: columnValidation.missing,
            extra: columnValidation.extra,
          })

          toast.error('❌ أعمدة Excel غير متطابقة! يرجى مراجعة الأعمدة المطلوبة أدناه.')

          setValidating(false)
          return
        } else {
          // إذا كانت الأعمدة متطابقة، مسح أي خطأ سابق
          setColumnValidationError(null)
        }
      }

      setPreviewData(jsonData as Record<string, unknown>[]) // Store all data for preview

      const newDbConflicts = new Set<number>()

      if (importType === 'employees') {
        // Load companies for validation
        const { data: companies } = await supabase
          .from('companies')
          .select('id, name, unified_number')
        const companyMapByUnifiedNumber = new Map<
          number,
          { id: string; name: string; unified_number?: number }
        >()
        companies?.forEach((c) => {
          if (c.unified_number) {
            companyMapByUnifiedNumber.set(Number(c.unified_number), {
              id: c.id,
              name: c.name,
              unified_number: c.unified_number ? Number(c.unified_number) : undefined,
            })
          }
        })

        // Load existing residence numbers from database for duplicate check
        const { data: existingEmployees } = await supabase
          .from('employees')
          .select('residence_number')
          .eq('is_deleted', false)
        const existingResidenceNumbers = new Set<string>()
        existingEmployees?.forEach((emp) => {
          if (emp.residence_number) {
            existingResidenceNumbers.add(emp.residence_number.toString().trim())
          }
        })

        // Track residence numbers in the sheet to detect duplicates within the sheet
        const residenceNumberMap = new Map<string, number[]>() // residence_number -> array of row indices

        jsonData.forEach((row: Record<string, unknown>, index: number) => {
          const residenceNumber = row['رقم الإقامة']?.toString().trim()
          if (residenceNumber) {
            if (!residenceNumberMap.has(residenceNumber)) {
              residenceNumberMap.set(residenceNumber, [])
            }
            residenceNumberMap.get(residenceNumber)!.push(index)
          }
        })

        jsonData.forEach((row: Record<string, unknown>, index: number) => {
          const rowNum = index + 2 // Excel row number (1 is header)

          // Check for company matching issues - search by unified number
          const unifiedNumber = row['الرقم الموحد'] || row['unified_number'] || ''
          const unifiedNumberStr = String(unifiedNumber).trim()

          if (unifiedNumberStr) {
            const unifiedNum = Number(unifiedNumberStr)
            if (!isNaN(unifiedNum)) {
              const company = companyMapByUnifiedNumber.get(unifiedNum)
              if (!company) {
                // Company not found by unified number
                errors.push({
                  row: rowNum,
                  field: 'الرقم الموحد',
                  message: `المؤسسة برقم موحد ${unifiedNum} غير موجودة في النظام`,
                  severity: 'error',
                })
              }
            } else {
              // Invalid unified number format
              errors.push({
                row: rowNum,
                field: 'الرقم الموحد',
                message: 'الرقم الموحد يجب أن يكون رقماً صحيحاً',
                severity: 'error',
              })
            }
          } else {
            // No unified number provided
            errors.push({
              row: rowNum,
              field: 'الرقم الموحد',
              message: 'الرقم الموحد للمؤسسة مطلوب للبحث عن المؤسسة',
              severity: 'error',
            })
          }

          // Required fields validation
          if (!row['الاسم'] || !row['الاسم'].toString().trim()) {
            errors.push({
              row: rowNum,
              field: 'الاسم',
              message: 'الاسم مطلوب',
              severity: 'error',
            })
          }

          // Residence validation (required)
          const residenceNumber = row['رقم الإقامة']?.toString().trim()
          if (!residenceNumber) {
            errors.push({
              row: rowNum,
              field: 'رقم الإقامة',
              message: 'رقم الإقامة مطلوب',
              severity: 'error',
            })
          } else {
            // Check for duplicates within the sheet
            const duplicateIndices = residenceNumberMap.get(residenceNumber) || []
            const [firstOccurrence] = duplicateIndices

            if (
              duplicateIndices.length > 1 &&
              firstOccurrence !== undefined &&
              duplicateIndices.indexOf(index) !== firstOccurrence
            ) {
              // This is a duplicate in the sheet (not the first occurrence)
              errors.push({
                row: rowNum,
                field: 'رقم الإقامة',
                message: `رقم الإقامة مكرر في الصف ${firstOccurrence + 2}. سيتم استيراد الصف الأول فقط.`,
                severity: 'error',
              })
            } else if (existingResidenceNumbers.has(residenceNumber)) {
              // Conflict with existing employee in DB - let user decide Keep/Replace
              errors.push({
                row: rowNum,
                field: 'رقم الإقامة',
                message:
                  'يوجد سجل بنفس رقم الإقامة في النظام. اختر الاحتفاظ بالسجل الحالي أو استبداله.',
                severity: 'warning',
              })
              newDbConflicts.add(index)
            }
          }

          // Mobile validation
          if (row['رقم الهاتف']) {
            const mobile = row['رقم الهاتف'].toString().replace(/\s/g, '')
            if (!/^[0-9+]{10,15}$/.test(mobile)) {
              errors.push({
                row: rowNum,
                field: 'رقم الهاتف',
                message: 'رقم الهاتف غير صحيح',
                severity: 'warning',
              })
            }
          }

          const hiredWorkerContractStatusValue =
            String(row['حالة عقد أجير'] || 'بدون أجير').trim() || 'بدون أجير'
          if (
            !HIRED_WORKER_CONTRACT_STATUS_OPTIONS.includes(
              hiredWorkerContractStatusValue as (typeof HIRED_WORKER_CONTRACT_STATUS_OPTIONS)[number]
            )
          ) {
            errors.push({
              row: rowNum,
              field: 'حالة عقد أجير',
              message: `القيمة غير صحيحة. القيم المسموحة: ${HIRED_WORKER_CONTRACT_STATUS_OPTIONS.join('، ')}`,
              severity: 'error',
            })
          }

          // Date validation using parseDate
          const dateFields = [
            'تاريخ الميلاد',
            'تاريخ الالتحاق',
            'تاريخ انتهاء الإقامة',
            'تاريخ انتهاء العقد',
            'تاريخ انتهاء عقد أجير',
            'تاريخ انتهاء التأمين الصحي',
          ]

          for (const field of dateFields) {
            if (row[field]) {
              const result = parseDate(String(row[field]))
              if (!result.date) {
                errors.push({
                  row: rowNum,
                  field: field,
                  message: result.error || `${field} غير صحيح`,
                  severity: 'error',
                })
              }
            }
          }
        })
      } else if (importType === 'companies') {
        const { data: existingCompanies } = await supabase
          .from('companies')
          .select('unified_number')

        const existingUnifiedNumbers = new Set<number>()
        existingCompanies?.forEach((c) => {
          if (c.unified_number) {
            const n = Number(c.unified_number)
            if (!isNaN(n)) existingUnifiedNumbers.add(n)
          }
        })

        jsonData.forEach((row: Record<string, unknown>, index: number) => {
          const rowNum = index + 2

          if (!row['اسم المؤسسة'] || !row['اسم المؤسسة'].toString().trim()) {
            errors.push({
              row: rowNum,
              field: 'اسم المؤسسة',
              message: 'اسم المؤسسة مطلوب',
              severity: 'error',
            })
          }

          // التحقق من الرقم الموحد (مطلوب)
          if (!row['الرقم الموحد'] || !row['الرقم الموحد'].toString().trim()) {
            errors.push({
              row: rowNum,
              field: 'الرقم الموحد',
              message: 'الرقم الموحد مطلوب',
              severity: 'error',
            })
          } else {
            // التحقق من صحة الرقم الموحد (يبدأ بـ 7 ويكون 10 أرقام)
            const unifiedValidation = validateUnifiedNumber(row['الرقم الموحد'].toString().trim())
            if (!unifiedValidation.valid) {
              errors.push({
                row: rowNum,
                field: 'الرقم الموحد',
                message: unifiedValidation.error || 'الرقم الموحد غير صحيح',
                severity: 'error',
              })
            }
          }

          // التحقق من صحة رقم قوى إذا تم إدخاله
          if (row['رقم اشتراك قوى'] && row['رقم اشتراك قوى'].toString().trim()) {
            const laborValidation = validateLaborSubscription(
              row['رقم اشتراك قوى'].toString().trim()
            )
            if (!laborValidation.valid) {
              errors.push({
                row: rowNum,
                field: 'رقم اشتراك قوى',
                message: laborValidation.error || 'رقم قوى غير صحيح',
                severity: 'error',
              })
            }
          }

          // تعارض مع سجل موجود في النظام باستخدام الرقم الموحد فقط
          const unifiedNumber = row['الرقم الموحد'] ? Number(row['الرقم الموحد']) : null
          if (
            unifiedNumber !== null &&
            !isNaN(unifiedNumber) &&
            existingUnifiedNumbers.has(unifiedNumber)
          ) {
            errors.push({
              row: rowNum,
              field: 'الرقم الموحد',
              message:
                'يوجد سجل بنفس الرقم الموحد في النظام. اختر الاحتفاظ بالسجل الحالي أو استبداله.',
              severity: 'warning',
            })
            newDbConflicts.add(index)
          }
        })

        // ✅ كشف التكرارات داخل ملف Excel نفسه (نفس الرقم الموحد مرتين في الملف)
        const unifiedNumberMap = new Map<number, number[]>()
        jsonData.forEach((row: Record<string, unknown>, index: number) => {
          const unifiedNumber = row['الرقم الموحد'] ? Number(row['الرقم الموحد']) : null
          if (unifiedNumber !== null && !isNaN(unifiedNumber)) {
            const indices = unifiedNumberMap.get(unifiedNumber) || []
            indices.push(index)
            unifiedNumberMap.set(unifiedNumber, indices)
          }
        })

        // أضف أخطاء للتكرارات داخل الملف نفسه
        unifiedNumberMap.forEach((indices, unifiedNumber) => {
          if (indices.length > 1) {
            // نفس الرقم الموحد موجود مرتين أو أكثر في ملف Excel
            indices.forEach((idx) => {
              const rowNum = idx + 2
              errors.push({
                row: rowNum,
                field: 'الرقم الموحد',
                message: `الرقم الموحد (${unifiedNumber}) مكرر في ملف Excel. لا يمكن استيراد صفين بنفس الرقم الموحد.`,
                severity: 'error',
              })
            })
          }
        })
      }

      setValidationResults(errors)
      setDbConflicts(newDbConflicts)

      // ✅ ضع الخيار الافتراضي "استبدال" لجميع التكرارات من قاعدة البيانات
      const defaultConflictResolution = new Map<number, 'keep' | 'replace'>()
      newDbConflicts.forEach((idx) => {
        defaultConflictResolution.set(idx, 'replace') // الافتراضي = استبدال
      })
      setConflictResolution(defaultConflictResolution)

      if (errors.filter((e) => e.severity === 'error').length === 0) {
        toast.success(`✓ تم التحقق من ${jsonData.length} سجل بنجاح`)
      } else {
        toast.warning(`تم العثور على ${errors.filter((e) => e.severity === 'error').length} خطأ`)
      }

      // فتح modal المعاينة إذا كانت هناك بيانات للعرض وليس هناك أخطاء في الأعمدة
      if (jsonData.length > 0 && !columnValidationError) {
        setShowPreviewModal(true)
      }
    } catch (error) {
      console.error('Validation error:', error)
      toast.error('فشل التحقق من البيانات')
    } finally {
      setValidating(false)
    }
  }

  const deleteDataBeforeImport = async (): Promise<boolean> => {
    try {
      logger.debug('🗑️ Starting deleteDataBeforeImport:', { deleteMode, importType })

      if (deleteMode === 'all') {
        // حذف جميع البيانات
        if (importType === 'companies') {
          logger.debug('🗑️ Deleting all companies...')
          setIsDeleting(true)
          setDeleteProgress({ current: 0, total: 0 })

          // جلب عدد المؤسسات المراد حذفها
          const { count: totalCount } = await supabase
            .from('companies')
            .select('id', { count: 'exact', head: true })
            .neq('id', '00000000-0000-0000-0000-000000000000')

          const totalCompanies = totalCount || 0
          setDeleteProgress({ current: 0, total: totalCompanies })

          // قبل حذف المؤسسات، تحديث الموظفين المرتبطين بها ليكونوا بدون شركة
          const { error: updateError } = await supabase
            .from('employees')
            .update({ company_id: null })
            .not('company_id', 'is', null)

          if (updateError) {
            console.error('❌ Error updating employees:', updateError)
            toast.error(`فشل تحديث الموظفين: ${updateError.message}`)
            setIsDeleting(false)
            setDeleteProgress({ current: 0, total: 0 })
            return false
          } else {
            logger.debug('✅ Successfully updated employees')
          }

          // حذف المؤسسات على دفعات
          const batchSize = 500
          let deletedCount = 0

          while (deletedCount < totalCompanies) {
            // جلب دفعة من المؤسسات للحذف
            const { data: batch, error: fetchError } = await supabase
              .from('companies')
              .select('id')
              .neq('id', '00000000-0000-0000-0000-000000000000')
              .limit(batchSize)

            if (fetchError) {
              console.error('❌ Error fetching companies batch:', fetchError)
              throw fetchError
            }

            if (!batch || batch.length === 0) {
              break
            }

            const batchIds = batch.map((c) => c.id)

            // حذف الدفعة
            const { error } = await supabase.from('companies').delete().in('id', batchIds)

            if (error) {
              console.error('❌ Error deleting companies batch:', error)
              throw error
            }

            deletedCount += batch.length
            setDeleteProgress({ current: deletedCount, total: totalCompanies })

            // إعطاء وقت للواجهة للتحديث
            await new Promise((resolve) => setTimeout(resolve, 50))
          }

          logger.debug('✅ Successfully deleted all companies')
          setIsDeleting(false)
          setDeleteProgress({ current: 0, total: 0 })
          toast.success(`تم حذف جميع المؤسسات بنجاح`)
        } else {
          logger.debug('🗑️ Deleting all employees...')
          setIsDeleting(true)
          setDeleteProgress({ current: 0, total: 0 })

          // جلب عدد الموظفين المراد حذفهم
          const { count: totalCount } = await supabase
            .from('employees')
            .select('id', { count: 'exact', head: true })
            .neq('id', '00000000-0000-0000-0000-000000000000')

          const totalEmployees = totalCount || 0
          setDeleteProgress({ current: 0, total: totalEmployees })

          // حذف الموظفين على دفعات
          const batchSize = 500
          let deletedCount = 0

          while (deletedCount < totalEmployees) {
            // جلب دفعة من الموظفين للحذف
            const { data: batch, error: fetchError } = await supabase
              .from('employees')
              .select('id')
              .neq('id', '00000000-0000-0000-0000-000000000000')
              .limit(batchSize)

            if (fetchError) {
              console.error('❌ Error fetching employees batch:', fetchError)
              throw fetchError
            }

            if (!batch || batch.length === 0) {
              break
            }

            const batchIds = batch.map((e) => e.id)

            // حذف الدفعة
            const { error } = await supabase.from('employees').delete().in('id', batchIds)

            if (error) {
              console.error('❌ Error deleting employees batch:', error)
              throw error
            }

            deletedCount += batch.length
            setDeleteProgress({ current: deletedCount, total: totalEmployees })

            // إعطاء وقت للواجهة للتحديث
            await new Promise((resolve) => setTimeout(resolve, 50))
          }

          logger.debug('✅ Successfully deleted all employees')
          setIsDeleting(false)
          setDeleteProgress({ current: 0, total: 0 })
          toast.success(`تم حذف جميع الموظفين بنجاح`)
        }
      } else {
        // حذف البيانات المطابقة فقط
        let data: ArrayBuffer
        try {
          data = await file!.arrayBuffer()
        } catch (error) {
          console.warn('First read attempt failed, retrying...', error)
          const fileInput = document.getElementById('file-upload') as HTMLInputElement
          if (fileInput && fileInput.files && fileInput.files[0]) {
            data = await fileInput.files[0].arrayBuffer()
          } else {
            throw new Error('لا يمكن قراءة الملف. يرجى المحاولة مرة أخرى.')
          }
        }
        const XLSX = await loadXlsx()
        const workbook = XLSX.read(data)
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          defval: '',
          raw: false,
        })

        if (importType === 'companies') {
          // حذف المؤسسات بنفس الرقم الموحد
          for (const row of jsonData as Record<string, unknown>[]) {
            const unifiedNumber = row['الرقم الموحد']
            if (unifiedNumber) {
              const unifiedNum = Number(unifiedNumber)
              if (!isNaN(unifiedNum)) {
                // البحث عن المؤسسات بنفس الرقم الموحد
                const { data: companiesToDelete } = await supabase
                  .from('companies')
                  .select('id')
                  .eq('unified_number', unifiedNum)

                if (companiesToDelete && companiesToDelete.length > 0) {
                  const companyIds = companiesToDelete.map((c) => c.id)

                  // تحديث الموظفين المرتبطين بهذه المؤسسات ليكونوا بدون شركة
                  const { error: updateError } = await supabase
                    .from('employees')
                    .update({ company_id: null })
                    .in('company_id', companyIds)

                  if (updateError) {
                    console.error('Error updating employees:', updateError)
                  }

                  // حذف المؤسسات
                  const { error } = await supabase
                    .from('companies')
                    .delete()
                    .eq('unified_number', unifiedNum)

                  if (error) throw error
                }
              }
            }
          }
        } else {
          logger.debug('🗑️ Deleting matching employees by residence number...')
          // حذف الموظفين بنفس رقم الإقامة
          let deletedCount = 0
          for (const row of jsonData as Record<string, unknown>[]) {
            const residenceNumber = row['رقم الإقامة']
            if (residenceNumber) {
              const { error } = await supabase
                .from('employees')
                .delete()
                .eq('residence_number', residenceNumber)

              if (error) {
                console.error(
                  `❌ Error deleting employee with residence number ${residenceNumber}:`,
                  error
                )
                toast.warning(`فشل حذف موظف برقم إقامة ${residenceNumber}`)
              } else {
                deletedCount += 1
              }
            }
          }
          logger.debug(`✅ Successfully deleted ${deletedCount} matching employees`)
          toast.success(`تم حذف ${deletedCount} موظف مطابق`)
        }
      }
      logger.debug('✅ deleteDataBeforeImport completed successfully')
      setIsDeleting(false)
      setDeleteProgress({ current: 0, total: 0 })
      return true
    } catch (error: unknown) {
      console.error('❌ Error in deleteDataBeforeImport:', error)
      setIsDeleting(false)
      setDeleteProgress({ current: 0, total: 0 })
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف'
      toast.error(`فشل حذف البيانات: ${errorMessage}`)
      return false
    }
  }

  const importData = async () => {
    if (!file) {
      toast.error('يرجى اختيار ملف أولاً')
      return
    }

    const blockingErrors = blockingErrorCount
    if (selectedRows.size > 0 && blockingErrors > 0) {
      toast.error('الصفوف المحددة تحتوي على أخطاء. يرجى إصلاحها أو إلغاء تحديدها قبل الاستيراد.')
      return
    }
    if (selectedRows.size === 0 && blockingErrors > 0) {
      toast.warning('ستتم متابعة الاستيراد مع تجاهل الصفوف التي تحتوي على أخطاء غير محددة.')
    }

    // التحقق من الحذف قبل الاستيراد
    if (shouldDeleteBeforeImport) {
      logger.debug('🔄 shouldDeleteBeforeImport is true, showing confirmation dialog')
      // التأكد من أن modal المعاينة مفتوح
      if (!showPreviewModal) {
        setShowPreviewModal(true)
      }
      // عرض مودال التأكيد بدلاً من window.confirm
      setPendingImport(() => async () => {
        logger.debug('🔄 pendingImport callback called')
        try {
          // التأكد من إعادة تعيين حالة الحذف
          setIsDeleting(false)
          setDeleteProgress({ current: 0, total: 0 })

          const deleted = await deleteDataBeforeImport()
          logger.debug('🔄 deleteDataBeforeImport returned:', deleted)

          if (!deleted) {
            logger.debug('❌ Delete failed, aborting import')
            setIsDeleting(false)
            setDeleteProgress({ current: 0, total: 0 })
            setShowConfirmDialog(false)
            setPendingImport(null)
            return
          }

          logger.debug('✅ Delete successful, proceeding with import')
          // التأكد من إعادة تعيين حالة الحذف قبل بدء الاستيراد
          setIsDeleting(false)
          setDeleteProgress({ current: 0, total: 0 })
          setShowConfirmDialog(false)
          setPendingImport(null)

          // متابعة الاستيراد
          logger.debug('🔄 Starting executeImport after delete')
          await executeImport()
          logger.debug('✅ executeImport completed')
        } catch (error) {
          console.error('❌ Error in pendingImport callback:', error)
          setIsDeleting(false)
          setDeleteProgress({ current: 0, total: 0 })
          const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف'
          toast.error(`فشل العملية: ${errorMessage}`)
          setShowConfirmDialog(false)
          setPendingImport(null)
        }
      })
      logger.debug('🔄 Setting showConfirmDialog to true')
      setShowConfirmDialog(true)
      return
    }

    // إذا لم يكن هناك حذف، مباشرة إلى الاستيراد
    logger.debug('🔄 No delete needed, proceeding directly to import')
    await executeImport()
  }

  const executeImport = async () => {
    logger.debug('🚀 executeImport started')
    if (!file) {
      console.error('❌ No file selected')
      toast.error('يرجى اختيار ملف أولاً')
      return
    }

    // بدء عملية الاستيراد
    logger.debug('🚀 Setting importing to true')
    setImporting(true)

    // إعادة تعيين حالة الإلغاء والسجلات المضافة
    setIsImportCancelled(false)
    cancelImportRef.current = false
    const emptyIds = { employees: [], companies: [] }
    setImportedIds(emptyIds)
    importedIdsRef.current = emptyIds

    let successCount = 0
    let failCount = 0

    // Helper function to clean project name (remove extra spaces, trim)
    // ترجع null إذا كان الاسم فارغاً أو "-" فقط (يعني الموظف ليس في مشروع)
    const cleanProjectName = (name: string | null | undefined): string | null => {
      if (!name) return null
      const cleaned = name.trim().replace(/\s+/g, ' ')
      // إذا كان الاسم فارغاً بعد التنظيف أو يساوي "-" فقط، لا نعتبره مشروعاً
      if (!cleaned || cleaned === '-' || cleaned.length === 0) return null
      return cleaned
    }

    try {
      const XLSX = await loadXlsx()
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      let jsonData = XLSX.utils.sheet_to_json(worksheet)

      // ===== معالجة التواريخ من Excel =====
      // دالة لقراءة التاريخ من خلية Excel بشكل صحيح (نفس المنطق المستخدم في validateData)
      const readDateFromCell = (
        cell: { w?: string; t?: string; v?: unknown } | undefined
      ): string => {
        if (!cell) return ''

        // إذا كان هناك نص منسق (cell.w)، استخدمه مباشرة - هذا هو النص المعروض في Excel
        if (cell.w) {
          const formattedText = String(cell.w).trim()
          // التحقق من أن النص ليس فارغاً أو مساوياً لقيمة افتراضية
          if (formattedText && formattedText !== '#N/A' && formattedText !== '#VALUE!') {
            return formattedText
          }
        }

        // إذا كانت القيمة رقم تسلسلي (Excel date serial number)
        if (cell.t === 'n' && typeof cell.v === 'number') {
          // التحقق من أن الرقم ضمن نطاق تاريخ Excel المعقول
          if (cell.v > 0 && cell.v < 1000000) {
            try {
              // تحويل الرقم التسلسلي إلى تاريخ
              const excelEpoch = new Date(1900, 0, 1)
              const days = Math.floor(cell.v) - 2 // Excel incorrectly treats 1900 as leap year
              const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000)

              // التحقق من أن التاريخ صحيح
              if (!isNaN(date.getTime())) {
                const year = date.getFullYear()
                // التحقق من أن السنة منطقية (بين 1900 و 2100)
                if (year >= 1900 && year <= 2100) {
                  // تنسيق التاريخ بصيغة DD-Mon-YYYY
                  const day = String(date.getDate()).padStart(2, '0')
                  const monthNames = [
                    'Jan',
                    'Feb',
                    'Mar',
                    'Apr',
                    'May',
                    'Jun',
                    'Jul',
                    'Aug',
                    'Sep',
                    'Oct',
                    'Nov',
                    'Dec',
                  ]
                  const month = monthNames[date.getMonth()]
                  return `${day}-${month}-${year}`
                }
              }
            } catch (e) {
              console.warn('Error converting Excel serial date:', e, 'value:', cell.v)
            }
          }
        }

        // إذا كانت القيمة نص، استخدمها مباشرة
        if (cell.v !== undefined && cell.v !== null) {
          const strValue = String(cell.v).trim()
          if (strValue && strValue !== 'null' && strValue !== 'undefined') {
            return strValue
          }
        }

        return ''
      }

      // تحديد أعمدة التواريخ
      const dateColumns =
        importType === 'employees'
          ? [
              'تاريخ الميلاد',
              'تاريخ الالتحاق',
              'تاريخ انتهاء الإقامة',
              'تاريخ انتهاء العقد',
              'تاريخ انتهاء عقد أجير',
              'تاريخ انتهاء التأمين الصحي',
            ]
          : ['تاريخ انتهاء السجل التجاري', 'تاريخ انتهاء اشتراك قوى', 'تاريخ انتهاء اشتراك مقيم']

      // قراءة الأعمدة من header row مباشرة (للتأكد من قراءة جميع الأعمدة حتى الفارغة)
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
      const excelColumns: string[] = []

      // قراءة الأعمدة من الصف الأول (header row)
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
        const cell = worksheet[cellAddress]
        if (cell) {
          const cellValue = cell.v !== undefined && cell.v !== null ? String(cell.v).trim() : ''
          if (cellValue) {
            excelColumns.push(cellValue)
          }
        }
      }

      // الحصول على indices الأعمدة للتواريخ بناءً على excelColumns
      const dateColumnIndices: { [key: string]: number } = {}
      excelColumns.forEach((col, index) => {
        if (dateColumns.includes(col)) {
          dateColumnIndices[col] = index
        }
      })

      // معالجة التواريخ من الخلايا مباشرة للحصول على القيم الصحيحة
      jsonData.forEach((row: Record<string, unknown>, rowIndex: number) => {
        // rowIndex + 1 لأن الصف الأول (0) في Excel هو header row
        const excelRowIndex = rowIndex + 1

        // معالجة كل عمود تاريخ
        dateColumns.forEach((colName) => {
          const colIndex = dateColumnIndices[colName]
          if (colIndex !== undefined && colIndex !== -1) {
            // الحصول على عنوان الخلية (مثل A2, B3, إلخ)
            const cellAddress = XLSX.utils.encode_cell({ r: excelRowIndex, c: colIndex })
            const cell = worksheet[cellAddress]

            if (cell) {
              // قراءة التاريخ من الخلية مباشرة
              const dateValue = readDateFromCell(cell)
              if (dateValue) {
                // استبدال القيمة في jsonData بالقيمة الصحيحة من الخلية
                row[colName] = dateValue
              } else {
                // إذا فشلت قراءة الخلية، احتفظ بالقيمة من jsonData بعد تنظيفها
                const fallbackValue = row[colName] ? String(row[colName] || '').trim() : ''
                row[colName] = fallbackValue
              }
            } else if (row[colName]) {
              // إذا لم تكن هناك خلية، احتفظ بالقيمة من jsonData
              row[colName] = String(row[colName] || '').trim()
            } else {
              row[colName] = ''
            }
          }
        })
      })
      // ===== نهاية معالجة التواريخ =====

      // تصفية البيانات حسب التحديد مع احترام التعارضات والتكرارات
      const targetIndices =
        selectedRows.size > 0
          ? new Set(Array.from(selectedRows))
          : new Set(jsonData.map((_, idx) => idx))

      const missingConflictChoices: number[] = []

      let rowsWithIndex = (jsonData as Record<string, unknown>[]).map((row, index) => ({
        row,
        index,
      }))

      const hasBlockingError = (idx: number) => blockingRowIndices.has(idx)

      // تطبيق التحديد واستبعاد أخطاء التحقق
      rowsWithIndex = rowsWithIndex.filter(({ index }) => {
        if (!targetIndices.has(index)) return false

        // استبعاد الصفوف ذات الأخطاء غير المحددة (أو المحددة لكن المفروض أن الزر لن يُفعّل حينها)
        if (hasBlockingError(index)) return false

        // معالجة التعارض مع بيانات DB
        if (dbConflicts.has(index)) {
          const choice = conflictResolution.get(index)
          if (choice === 'keep') return false // تجاهل الصف
          if (!choice) {
            // لا يوجد اختيار بعد: نتجاهل الصف بشكل آمن ونبلغ المستخدم
            missingConflictChoices.push(index)
            return false
          }
        }

        return true
      })

      if (missingConflictChoices.length > 0) {
        toast.warning(
          'تم تجاهل بعض الصفوف المتعارضة بدون اختيار (إبقاء/استبدال). يرجى تحديد القرار إذا رغبت بتحديثها.'
        )
      }

      // إزالة التكرارات ديناميكياً بناءً على الصفوف المستهدفة
      const seenKeys = new Set<string>()
      rowsWithIndex = rowsWithIndex.filter(({ row }) => {
        const keyRaw =
          importType === 'employees'
            ? row['رقم الإقامة']?.toString().trim()
            : row['الرقم الموحد']?.toString().trim()
        if (!keyRaw) return true
        if (seenKeys.has(keyRaw)) return false
        seenKeys.add(keyRaw)
        return true
      })

      jsonData = rowsWithIndex.map((r) => r.row)

      let duplicatesRemoved = 0
      let uniqueJsonData = jsonData

      if (importType === 'employees') {
        // Filter duplicates within the sheet based on residence_number (keep first occurrence only)
        const seenResidenceNumbers = new Set<string>()
        uniqueJsonData = (jsonData as Record<string, unknown>[]).filter((row) => {
          const residenceNumber = row['رقم الإقامة']?.toString().trim()
          if (!residenceNumber) {
            return true // Keep rows without residence number (they will fail validation anyway)
          }
          if (seenResidenceNumbers.has(residenceNumber)) {
            return false // Skip duplicate
          }
          seenResidenceNumbers.add(residenceNumber)
          return true
        })

        duplicatesRemoved = jsonData.length - uniqueJsonData.length
        if (duplicatesRemoved > 0) {
          logger.debug(`تم إزالة ${duplicatesRemoved} صف مكرر بناءً على رقم الإقامة`)
        }

        // Get companies for lookup with unified_number
        const { data: companies } = await supabase
          .from('companies')
          .select('id, name, unified_number')

        // Get projects for lookup (exclude deleted)
        const { data: projects } = await supabase.from('projects').select('id, name').eq('is_deleted', false)

        // Load existing active employees from database with their IDs for update operations
        const { data: existingEmployees } = await supabase
          .from('employees')
          .select('id, residence_number')
          .eq('is_deleted', false)
        const existingEmployeesByResidenceNumber = new Map<string, string>() // residence_number -> employee_id
        existingEmployees?.forEach((emp) => {
          if (emp.residence_number) {
            existingEmployeesByResidenceNumber.set(emp.residence_number.toString().trim(), emp.id)
          }
        })

        // Create maps for lookup
        const companyMapByUnifiedNumber = new Map<number, string>() // unified_number -> id
        const projectMapByName = new Map<string, string>() // name -> id (projects should be unique by name)
        const newProjectsCreated = new Map<string, string>() // Track newly created projects to avoid duplicates

        companies?.forEach((c) => {
          // Map by unified_number (should be unique - primary lookup method)
          if (c.unified_number) {
            companyMapByUnifiedNumber.set(Number(c.unified_number), c.id)
          }
        })

        // Create project map from existing projects
        projects?.forEach((p) => {
          if (p.name) {
            const cleaned = cleanProjectName(p.name)
            if (cleaned) {
              projectMapByName.set(cleaned.toLowerCase(), p.id)
            }
          }
        })

        // تحديد العدد الإجمالي للعناصر المستوردة بعد التصفية
        const totalItems = uniqueJsonData.length

        // تهيئة شريط التقدم
        setImportProgress({ current: 0, total: totalItems })

        // [PERF] Batch insert state — نجمع الموظفين الجدد ونرسلهم دفعات
        const INSERT_BATCH_SIZE = 100
        const pendingInserts: Record<string, unknown>[] = []
        const flushInsertBatch = async () => {
          if (pendingInserts.length === 0) return
          const batch = pendingInserts.splice(0, pendingInserts.length)
          const { data: inserted, error: batchError } = await supabase
            .from('employees')
            .insert(batch)
            .select('id, residence_number')

          if (batchError) {
            // Fallback: insert one-by-one to handle race conditions / individual failures
            for (const row of batch) {
              try {
                const { data: single, error: singleErr } = await supabase
                  .from('employees')
                  .insert(row)
                  .select('id, residence_number')
                  .single()
                if (singleErr) {
                  if (singleErr.code === '23505') {
                    const rn = (row.residence_number as { toString?: () => string })?.toString?.()?.trim()
                    if (rn) {
                      const { data: existing } = await supabase
                        .from('employees')
                        .select('id')
                        .eq('residence_number', rn)
                        .eq('is_deleted', false)
                        .single()
                      if (existing) {
                        const cleaned = cleanEmployeeDataForUpdate(row)
                        const { error: updErr } = await supabase
                          .from('employees')
                          .update(cleaned)
                          .eq('id', existing.id)
                        if (updErr) failCount++
                        else successCount++
                        continue
                      }
                    }
                  }
                  console.error('Single-row insert failed:', singleErr)
                  failCount++
                } else if (single) {
                  successCount++
                  const rn = single.residence_number?.toString().trim()
                  if (rn) existingEmployeesByResidenceNumber.set(rn, single.id)
                  setImportedIds((prev) => {
                    const updated = { ...prev, employees: [...prev.employees, single.id] }
                    importedIdsRef.current = updated
                    return updated
                  })
                }
              } catch (e) {
                console.error('Single-row insert exception:', e)
                failCount++
              }
            }
          } else if (inserted && inserted.length > 0) {
            successCount += inserted.length
            inserted.forEach((emp) => {
              const rn = emp.residence_number?.toString().trim()
              if (rn) existingEmployeesByResidenceNumber.set(rn, emp.id)
            })
            setImportedIds((prev) => {
              const updated = {
                ...prev,
                employees: [...prev.employees, ...inserted.map((e) => e.id)],
              }
              importedIdsRef.current = updated
              return updated
            })
          }
        }
        // تعريف cleanEmployeeDataForUpdate خارج الحلقة عشان flushInsertBatch يقدر يستخدمها
        const cleanEmployeeDataForUpdate = (
          data: Record<string, unknown>
        ): Record<string, unknown> => {
          const cleaned: Record<string, unknown> = {}
          const requiredFields = ['name', 'residence_number', 'company_id']
          Object.keys(data).forEach((key) => {
            if (requiredFields.includes(key)) {
              cleaned[key] = data[key]
            } else if (data[key] !== null && data[key] !== undefined) {
              cleaned[key] = data[key]
            }
          })
          return cleaned
        }

        let currentIndex = 0
        for (const row of uniqueJsonData as Record<string, unknown>[]) {
          // التحقق من حالة الإلغاء
          if (cancelImportRef.current) {
            logger.debug('تم إلغاء الاستيراد من قبل المستخدم')
            break
          }

          currentIndex++
          setImportProgress({ current: currentIndex, total: totalItems })

          try {
            let companyId: string | null = null

            // Find company by unified_number (primary key for company lookup)
            const unifiedNumber = row['الرقم الموحد']
            if (unifiedNumber) {
              const unifiedNum = Number(unifiedNumber)
              if (!isNaN(unifiedNum)) {
                companyId = companyMapByUnifiedNumber.get(unifiedNum) || null
              }
            }

            // Handle project matching and creation
            let projectId: string | null = null
            const projectNameRaw = (row['المشروع'] || row['اسم المشروع'] || null) as string | null
            const projectNameClean = cleanProjectName(projectNameRaw)

            if (projectNameClean) {
              const projectNameLower = projectNameClean.toLowerCase()

              // 1. Check if project already exists in map
              if (projectMapByName.has(projectNameLower)) {
                projectId = projectMapByName.get(projectNameLower) || null
              }
              // 2. Check if we already created this project in this import session
              else if (newProjectsCreated.has(projectNameLower)) {
                projectId = newProjectsCreated.get(projectNameLower) || null
              }
              // 3. Create new project
              else {
                try {
                  const { data: newProject, error: projectError } = await supabase
                    .from('projects')
                    .insert({
                      name: projectNameClean,
                      status: 'active',
                    })
                    .select()
                    .single()

                  if (projectError) {
                    // If project already exists (race condition), try to fetch it
                    if (projectError.code === '23505') {
                      const { data: existingProject } = await supabase
                        .from('projects')
                        .select('id, name')
                        .eq('name', projectNameClean)
                        .single()

                      if (existingProject) {
                        projectId = existingProject.id
                        projectMapByName.set(projectNameLower, existingProject.id)
                      }
                    } else {
                      console.warn(`Failed to create project "${projectNameClean}":`, projectError)
                    }
                  } else if (newProject) {
                    projectId = newProject.id
                    projectMapByName.set(projectNameLower, newProject.id)
                    newProjectsCreated.set(projectNameLower, newProject.id)
                  }
                } catch (createError) {
                  console.error(`Error creating project "${projectNameClean}":`, createError)
                }
              }
            }

            // التحقق من أن كل حقل تاريخ يُستورد في مكانه الصحيح
            const birthDateRaw = row['تاريخ الميلاد']
            const joiningDateRaw = row['تاريخ الالتحاق']
            const residenceExpiryRaw = row['تاريخ انتهاء الإقامة']
            const contractExpiryRaw = row['تاريخ انتهاء العقد']
            const hiredWorkerContractExpiryRaw = row['تاريخ انتهاء عقد أجير']
            const healthInsuranceExpiryRaw = row['تاريخ انتهاء التأمين الصحي']

            // Debug: طباعة القيم الأولية للتأكد من عدم الخلط
            if (currentIndex <= 5) {
              // طباعة أول 5 موظفين للتحقق
              logger.debug(
                `📋 Employee ${currentIndex + 1} (${row['الاسم']}) - Raw dates from Excel:`,
                {
                  'تاريخ الميلاد': birthDateRaw
                    ? `${birthDateRaw} (type: ${typeof birthDateRaw})`
                    : '(فارغ)',
                  'تاريخ الالتحاق': joiningDateRaw
                    ? `${joiningDateRaw} (type: ${typeof joiningDateRaw})`
                    : '(فارغ)',
                  'تاريخ انتهاء الإقامة': residenceExpiryRaw
                    ? `${residenceExpiryRaw} (type: ${typeof residenceExpiryRaw})`
                    : '(فارغ)',
                  'تاريخ انتهاء العقد': contractExpiryRaw
                    ? `${contractExpiryRaw} (type: ${typeof contractExpiryRaw})`
                    : '(فارغ)',
                  'تاريخ انتهاء عقد أجير': hiredWorkerContractExpiryRaw
                    ? `${hiredWorkerContractExpiryRaw} (type: ${typeof hiredWorkerContractExpiryRaw})`
                    : '(فارغ)',
                  'تاريخ انتهاء التأمين الصحي': healthInsuranceExpiryRaw
                    ? `${healthInsuranceExpiryRaw} (type: ${typeof healthInsuranceExpiryRaw})`
                    : '(فارغ)',
                }
              )
            }

            // تحويل التواريخ باستخدام normalizeDate - مع معالجة أفضل للقيم الفارغة
            const normalizedBirthDate = birthDateRaw ? normalizeDate(String(birthDateRaw)) : null
            const normalizedJoiningDate = joiningDateRaw
              ? normalizeDate(String(joiningDateRaw))
              : null
            const normalizedResidenceExpiry = residenceExpiryRaw
              ? normalizeDate(String(residenceExpiryRaw))
              : null
            const normalizedContractExpiry = contractExpiryRaw
              ? normalizeDate(String(contractExpiryRaw))
              : null
            const normalizedHiredWorkerContractExpiry = hiredWorkerContractExpiryRaw
              ? normalizeDate(String(hiredWorkerContractExpiryRaw))
              : null
            const normalizedHealthInsuranceExpiry = healthInsuranceExpiryRaw
              ? normalizeDate(String(healthInsuranceExpiryRaw))
              : null

            // Debug: طباعة نتائج normalizeDate
            if (currentIndex <= 5) {
              logger.debug(
                `🔄 Employee ${currentIndex + 1} (${row['الاسم']}) - After normalizeDate:`,
                {
                  birth_date: normalizedBirthDate || '(null - will not be saved)',
                  joining_date: normalizedJoiningDate || '(null - will not be saved)',
                  residence_expiry: normalizedResidenceExpiry || '(null - will not be saved)',
                  contract_expiry: normalizedContractExpiry || '(null - will not be saved)',
                  hired_worker_contract_expiry:
                    normalizedHiredWorkerContractExpiry || '(null - will not be saved)',
                  health_insurance_expiry:
                    normalizedHealthInsuranceExpiry || '(null - will not be saved)',
                }
              )
            }

            const employeeData: Record<string, unknown> = {
              name: row['الاسم'],
              profession: row['المهنة'] || null,
              nationality: row['الجنسية'] || null,
              residence_number: row['رقم الإقامة'] || null,
              passport_number: row['رقم الجواز'] || null,
              phone: row['رقم الهاتف']?.toString() || row['رقم الجوال']?.toString() || null,
              bank_account: row['الحساب البنكي'] || null,
              salary: row['الراتب'] ? Number(row['الراتب']) : null,
              project_id: projectId,
              company_id: companyId,
              additional_fields: buildEmployeeBusinessAdditionalFields(undefined, {
                bank_name: String(row['اسم البنك'] || '').trim(),
                hired_worker_contract_status:
                  String(row['حالة عقد أجير'] || 'بدون أجير').trim() || 'بدون أجير',
                hired_worker_contract_expiry: normalizedHiredWorkerContractExpiry,
              }),
              // التأكد من أن كل حقل تاريخ يُستورد في مكانه الصحيح
              // عند INSERT: نحفظ جميع التواريخ (حتى null) لأنها حقول جديدة
              // عند UPDATE: سنزيل null في cleanEmployeeDataForUpdate
              birth_date: normalizedBirthDate, // تاريخ الميلاد → birth_date
              joining_date: normalizedJoiningDate, // تاريخ الالتحاق → joining_date
              residence_expiry: normalizedResidenceExpiry, // تاريخ انتهاء الإقامة → residence_expiry
              contract_expiry: normalizedContractExpiry, // تاريخ انتهاء العقد → contract_expiry
              hired_worker_contract_expiry: normalizedHiredWorkerContractExpiry, // تاريخ انتهاء عقد أجير → hired_worker_contract_expiry
              health_insurance_expiry: normalizedHealthInsuranceExpiry, // تاريخ انتهاء التأمين الصحي → health_insurance_expiry
              notes: row['الملاحظات'] || null,
            }

            // Debug: طباعة القيم النهائية قبل الحفظ
            if (currentIndex <= 5) {
              logger.debug(
                `✅ Employee ${currentIndex + 1} (${row['الاسم']}) - Final employeeData before save:`,
                {
                  birth_date: employeeData.birth_date || '(null)',
                  joining_date: employeeData.joining_date || '(null)',
                  residence_expiry: employeeData.residence_expiry || '(null)',
                  contract_expiry: employeeData.contract_expiry || '(null)',
                  hired_worker_contract_expiry:
                    employeeData.hired_worker_contract_expiry || '(null)',
                  health_insurance_expiry: employeeData.health_insurance_expiry || '(null)',
                }
              )
            }

            // دعم التوافق مع الأسماء القديمة والجديدة للتأمين الصحي
            if (
              !employeeData.health_insurance_expiry &&
              (row['انتهاء التأمين الصحي'] || row['انتهاء اشتراك التأمين'])
            ) {
              const healthInsuranceExpiry =
                row['انتهاء التأمين الصحي'] || row['انتهاء اشتراك التأمين']
              employeeData.health_insurance_expiry = normalizeDate(String(healthInsuranceExpiry))
            }

            // Check if residence number already exists - update instead of insert
            const residenceNumberStr = employeeData.residence_number?.toString().trim()

            if (residenceNumberStr && existingEmployeesByResidenceNumber.has(residenceNumberStr)) {
              // Update existing employee - تنظيف البيانات لإزالة الحقول null
              const existingEmployeeId = existingEmployeesByResidenceNumber.get(residenceNumberStr)!
              const cleanedEmployeeData = cleanEmployeeDataForUpdate(employeeData)

              // Debug: طباعة البيانات قبل وبعد التنظيف
              if (currentIndex <= 5) {
                logger.debug(
                  `🔄 Employee ${currentIndex + 1} (${row['الاسم']}) - UPDATE operation:`,
                  {
                    operation: 'UPDATE',
                    residence_number: residenceNumberStr,
                    before_cleaning: {
                      birth_date: employeeData.birth_date || '(null)',
                      residence_expiry: employeeData.residence_expiry || '(null)',
                      joining_date: employeeData.joining_date || '(null)',
                      contract_expiry: employeeData.contract_expiry || '(null)',
                    },
                    after_cleaning: {
                      birth_date:
                        cleanedEmployeeData.birth_date || '(removed - will keep existing)',
                      residence_expiry:
                        cleanedEmployeeData.residence_expiry || '(removed - will keep existing)',
                      joining_date:
                        cleanedEmployeeData.joining_date || '(removed - will keep existing)',
                      contract_expiry:
                        cleanedEmployeeData.contract_expiry || '(removed - will keep existing)',
                    },
                  }
                )
              }

              const { error: updateError } = await supabase
                .from('employees')
                .update(cleanedEmployeeData)
                .eq('id', existingEmployeeId)

              if (updateError) {
                throw updateError
              }
            } else {
              // Insert new employee
              if (currentIndex <= 5) {
                logger.debug(
                  `➕ Employee ${currentIndex + 1} (${row['الاسم']}) - INSERT operation:`,
                  {
                    operation: 'INSERT',
                    residence_number: residenceNumberStr,
                    dates_to_insert: {
                      birth_date: employeeData.birth_date || '(null)',
                      residence_expiry: employeeData.residence_expiry || '(null)',
                      joining_date: employeeData.joining_date || '(null)',
                      contract_expiry: employeeData.contract_expiry || '(null)',
                    },
                  }
                )
              }
              // [PERF] Push to batch instead of immediate INSERT
              pendingInserts.push(employeeData)
              if (pendingInserts.length >= INSERT_BATCH_SIZE) {
                await flushInsertBatch()
              }
              // ملاحظة: successCount يُحسب في flushInsertBatch للـ INSERTs
              continue
            }

            // إذا وصلنا هنا فهي عملية UPDATE ناجحة
            successCount++
          } catch (error) {
            console.error('Error inserting employee:', error)
            failCount++
          }
        }
        // [PERF] Flush remaining INSERTs after the loop
        await flushInsertBatch()
      } else if (importType === 'companies') {
        // تحديد العدد الإجمالي للعناصر المستوردة
        const totalItems = jsonData.length

        // تهيئة شريط التقدم
        setImportProgress({ current: 0, total: totalItems })

        // Load existing companies for update operations
        const { data: existingCompanies } = await supabase
          .from('companies')
          .select('id, unified_number')

        // Create maps for lookup by unique identifiers
        const companiesByUnifiedNumber = new Map<number, string>() // unified_number -> company_id

        existingCompanies?.forEach((company) => {
          if (company.unified_number) {
            companiesByUnifiedNumber.set(Number(company.unified_number), company.id)
          }
        })

        // [PERF] Batch insert state for companies
        const COMPANY_INSERT_BATCH_SIZE = 100
        const pendingCompanyInserts: Record<string, unknown>[] = []
        const flushCompanyInsertBatch = async () => {
          if (pendingCompanyInserts.length === 0) return
          const batch = pendingCompanyInserts.splice(0, pendingCompanyInserts.length)
          const { data: inserted, error: batchError } = await supabase
            .from('companies')
            .insert(batch)
            .select('id, unified_number')

          if (batchError) {
            // Fallback: per-row inserts to handle race conditions
            for (const row of batch) {
              try {
                const { data: single, error: singleErr } = await supabase
                  .from('companies')
                  .insert(row)
                  .select('id, unified_number')
                  .single()
                if (singleErr) {
                  if (singleErr.code === '23505' && row.unified_number) {
                    const { data: found } = await supabase
                      .from('companies')
                      .select('id')
                      .eq('unified_number', row.unified_number)
                      .single()
                    if (found) {
                      const { error: updErr } = await supabase
                        .from('companies')
                        .update(row)
                        .eq('id', found.id)
                      if (updErr) failCount++
                      else successCount++
                      continue
                    }
                  }
                  console.error('Single company insert failed:', singleErr)
                  failCount++
                } else if (single) {
                  successCount++
                  if (single.unified_number) {
                    companiesByUnifiedNumber.set(Number(single.unified_number), single.id)
                  }
                  setImportedIds((prev) => {
                    const updated = { ...prev, companies: [...prev.companies, single.id] }
                    importedIdsRef.current = updated
                    return updated
                  })
                }
              } catch (e) {
                console.error('Single company insert exception:', e)
                failCount++
              }
            }
          } else if (inserted && inserted.length > 0) {
            successCount += inserted.length
            inserted.forEach((c) => {
              if (c.unified_number) {
                companiesByUnifiedNumber.set(Number(c.unified_number), c.id)
              }
            })
            setImportedIds((prev) => {
              const updated = {
                ...prev,
                companies: [...prev.companies, ...inserted.map((c) => c.id)],
              }
              importedIdsRef.current = updated
              return updated
            })
          }
        }

        let currentIndex = 0
        for (const row of jsonData as Record<string, unknown>[]) {
          // التحقق من حالة الإلغاء
          if (cancelImportRef.current) {
            logger.debug('تم إلغاء الاستيراد من قبل المستخدم')
            break
          }

          currentIndex++
          setImportProgress({ current: currentIndex, total: totalItems })

          try {
            const companyData: Record<string, unknown> = {
              name: row['اسم المؤسسة'],
              unified_number: row['الرقم الموحد'] ? Number(row['الرقم الموحد']) : null,
              social_insurance_number: row['رقم اشتراك التأمينات الاجتماعية'] || null,
              labor_subscription_number: row['رقم اشتراك قوى'] || null,
              commercial_registration_expiry: normalizeDate(
                String(row['تاريخ انتهاء السجل التجاري'] ?? '')
              ),
              ending_subscription_power_date: normalizeDate(
                String(row['تاريخ انتهاء اشتراك قوى'] ?? '')
              ),
              ending_subscription_moqeem_date: normalizeDate(
                String(row['تاريخ انتهاء اشتراك مقيم'] ?? '')
              ),
              exemptions: row['الاعفاءات'] || null,
              company_type: row['نوع المؤسسة'] || null,
              notes: row['الملاحظات'] || null,
              max_employees: 4, // القيمة الافتراضية
            }

            // Check for existing company by unique identifiers
            let existingCompanyId: string | null = null

            // التفرد بالرقم الموحد فقط
            if (companyData.unified_number) {
              existingCompanyId =
                companiesByUnifiedNumber.get(Number(companyData.unified_number)) || null
            }

            if (existingCompanyId) {
              // Update existing company
              const { error: updateError } = await supabase
                .from('companies')
                .update(companyData)
                .eq('id', existingCompanyId)

              if (updateError) throw updateError
            } else {
              // [PERF] Push to batch instead of immediate INSERT
              pendingCompanyInserts.push(companyData)
              if (pendingCompanyInserts.length >= COMPANY_INSERT_BATCH_SIZE) {
                await flushCompanyInsertBatch()
              }
              continue
            }
            // إذا وصلنا هنا فهي عملية UPDATE ناجحة
            successCount++
          } catch (error) {
            console.error('Error inserting/updating company:', error)
            failCount++
          }
        }
        // [PERF] Flush remaining company INSERTs after the loop
        await flushCompanyInsertBatch()
      }

      // التحقق من حالة الإلغاء
      if (cancelImportRef.current) {
        // حذف السجلات المضافة في هذه الجلسة
        await rollbackImportedData()
        toast.warning('تم إلغاء الاستيراد وحذف السجلات المضافة')
        const totalProcessed = importType === 'employees' ? uniqueJsonData.length : jsonData.length
        setImportResult({
          total: totalProcessed,
          success: 0,
          failed: failCount,
          errors: [],
        })
        // لا نستدعي onImportSuccess في حالة الإلغاء
      } else {
        const totalProcessed = importType === 'employees' ? uniqueJsonData.length : jsonData.length

        setImportResult({
          total: totalProcessed,
          success: successCount,
          failed: failCount,
          errors: [],
        })

        if (successCount > 0) {
          // تسجيل نشاط الاستيراد (non-blocking)
          try {
            const totalProcessedLocal = importType === 'employees' ? uniqueJsonData.length : jsonData.length
            await supabase.from('activity_log').insert({
              entity_type: 'import',
              action: importType === 'employees' ? 'استيراد موظفين' : 'استيراد مؤسسات',
              details: {
                added: successCount,
                updated: 0,
                failed: failCount,
                total: totalProcessedLocal,
              },
            })
          } catch { /* non-blocking */ }

          const duplicateMessage =
            duplicatesRemoved > 0 ? ` (تم استبعاد ${duplicatesRemoved} صف مكرر)` : ''
          toast.success(
            `✓ تم الاستيراد بنجاح: ${successCount} ${importType === 'employees' ? 'موظف' : 'مؤسسة'}${duplicateMessage}`
          )

          // استدعاء callback النجاح إذا كان موجوداً (حتى لو كان هناك بعض الأخطاء)
          if (onImportSuccess) {
            onImportSuccess()
          }

          // Close preview and reset after successful import
          setTimeout(() => {
            setShowPreviewModal(false)
            setFile(null)
            setPreviewData([])
            setValidationResults([])
            setSelectedRows(new Set())
            setImportResult(null)
            setCurrentPage(1)
            setColumnValidationError(null)
          }, 1500)
        } else {
          // إذا لم يكن هناك أي نجاح، لا نستدعي onImportSuccess
          toast.error('لم يتم استيراد أي سجلات. يرجى التحقق من البيانات والمحاولة مرة أخرى.')
        }

        if (failCount > 0) {
          toast.error(`✗ فشل استيراد ${failCount} سجل`)
        }
      }
    } catch (error) {
      console.error('Import error:', error)
      // في حالة الخطأ، حاول حذف السجلات المضافة
      if (
        importedIdsRef.current.employees.length > 0 ||
        importedIdsRef.current.companies.length > 0
      ) {
        await rollbackImportedData()
      }
      toast.error('فشل عملية الاستيراد')
    } finally {
      setImporting(false)
      setImportProgress({ current: 0, total: 0 })
      setIsImportCancelled(false)
      cancelImportRef.current = false
      const emptyIds = { employees: [], companies: [] }
      setImportedIds(emptyIds)
      importedIdsRef.current = emptyIds
    }
  }

  // دالة لحذف السجلات المضافة عند الإلغاء
  const rollbackImportedData = async () => {
    try {
      const idsToDelete = importedIdsRef.current

      // حذف الموظفين المضافة
      if (idsToDelete.employees.length > 0) {
        const { error: employeesError } = await supabase
          .from('employees')
          .delete()
          .in('id', idsToDelete.employees)

        if (employeesError) {
          console.error('Error deleting imported employees:', employeesError)
        } else {
          logger.debug(`تم حذف ${idsToDelete.employees.length} موظف تم إضافتهم`)
        }
      }

      // حذف الشركات المضافة
      if (idsToDelete.companies.length > 0) {
        const { error: companiesError } = await supabase
          .from('companies')
          .delete()
          .in('id', idsToDelete.companies)

        if (companiesError) {
          console.error('Error deleting imported companies:', companiesError)
        } else {
          logger.debug(`تم حذف ${idsToDelete.companies.length} شركة تم إضافتها`)
        }
      }
    } catch (error) {
      console.error('Error in rollback:', error)
    }
  }

  // دالة لإلغاء الاستيراد
  const cancelImport = async () => {
    if (!importing) return

    cancelImportRef.current = true
    setIsImportCancelled(true)
    toast.info('جاري إلغاء الاستيراد وحذف السجلات المضافة...')
  }

  const handleFilterChange = (filter: 'all' | 'errors' | 'warnings') => {
    setValidationFilter(filter)
    setCurrentPage(1)
  }

  const exportValidationReport = async () => {
    if (previewData.length === 0) return

    const dataColumns = getOrderedColumns(Object.keys(previewData[0]), previewData)
    const header = ['Status', 'Excel Row', ...dataColumns, 'Issue Details']

    const rows = previewData.map((row, index) => {
      const excelRowNumber = index + 2
      const rowIssues = validationResults.filter((error) => error.row === excelRowNumber)
      const hasError = rowIssues.some((error) => error.severity === 'error')
      const hasWarning = rowIssues.some((error) => error.severity === 'warning')
      const status = hasError ? 'ERROR' : hasWarning ? 'WARNING' : 'OK'
      const issueDetails = rowIssues.map((issue) => `[${issue.field}] ${issue.message}`).join(' | ')
      const rowValues = dataColumns.map((column) => row[column] ?? '')
      return [status, excelRowNumber, ...rowValues, issueDetails || '']
    })

    const XLSX = await loadXlsx()
    const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Validation Report')
    const fileName = `import-validation-${importType}-${new Date().toISOString().slice(0, 10)}.xlsx`
    XLSX.writeFile(workbook, fileName)
    toast.success('تم تصدير تقرير التحقق إلى Excel')
  }

  // حساب الأخطاء في جميع الصفوف
  const errorRowCount = new Set(
    validationResults.filter((e) => e.severity === 'error').map((e) => e.row)
  ).size
  const warningRowCount = new Set(
    validationResults.filter((e) => e.severity === 'warning').map((e) => e.row)
  ).size

  const isInternalDuplicateError = (error: ValidationError): boolean => {
    if (error.severity !== 'error') return false
    return error.message.includes('مكرر في ملف Excel') || error.message.includes('مكرر في الصف')
  }

  // نطاق الاستيراد الحالي: الصفوف المحددة فقط، أو كل الصفوف عند عدم وجود تحديد.
  const activeScopeIndices = useMemo(() => {
    const indicesRaw = selectedRows.size > 0 ? Array.from(selectedRows) : previewData.map((_, idx) => idx)
    return indicesRaw.filter((idx) => idx >= 0 && idx < previewData.length)
  }, [selectedRows, previewData])

  // حساب أخطاء مانعة ديناميكياً بناءً على الصفوف المحددة والتكرارات الفعلية
  const blockingRowIndices = useMemo((): Set<number> => {
    const errorRows = new Set<number>()
    const targetIndices = activeScopeIndices

    // تجميع التكرارات داخل النطاق المحدد فقط.
    const duplicateGroups = new Map<string, number[]>()
    targetIndices.forEach((idx) => {
      const row = previewData[idx]
      if (!row) return
      const key =
        importType === 'employees'
          ? row['رقم الإقامة']?.toString().trim()
          : row['الرقم الموحد']?.toString().trim()
      if (!key) return
      const list = duplicateGroups.get(key) || []
      list.push(idx)
      duplicateGroups.set(key, list)
    })

    // احسب الأخطاء المانعة لكل صف داخل النطاق المحدد.
    targetIndices.forEach((idx) => {
      const excelRowNumber = idx + 2
      const rowErrors = validationResults.filter(
        (error) => error.severity === 'error' && error.row === excelRowNumber
      )

      if (rowErrors.length === 0) return

      // أي خطأ غير متعلق بالتكرار الداخلي = مانع مباشرة.
      const hasNonDuplicateError = rowErrors.some((error) => !isInternalDuplicateError(error))
      if (hasNonDuplicateError) {
        errorRows.add(idx)
        return
      }

      // أخطاء التكرار الداخلي فقط: تكون مانعة فقط إذا ما زال هناك أكثر من صف مكرر في النطاق المحدد.
      const hasInternalDuplicateOnly = rowErrors.some((error) => isInternalDuplicateError(error))
      if (!hasInternalDuplicateOnly) return

      const row = previewData[idx]
      if (!row) return

      const key =
        importType === 'employees'
          ? row['رقم الإقامة']?.toString().trim()
          : row['الرقم الموحد']?.toString().trim()
      if (!key) {
        errorRows.add(idx)
        return
      }

      const groupSize = duplicateGroups.get(key)?.length ?? 0
      if (groupSize > 1) {
        errorRows.add(idx)
      }
    })

    return errorRows
  }, [activeScopeIndices, previewData, validationResults, importType])

  const blockingErrorCount = blockingRowIndices.size

  const warningRowCountInScope = useMemo(() => {
    const warningRows = new Set<number>()
    activeScopeIndices.forEach((idx) => {
      const excelRowNumber = idx + 2
      const hasWarning = validationResults.some(
        (error) => error.severity === 'warning' && error.row === excelRowNumber
      )
      if (hasWarning) {
        warningRows.add(idx)
      }
    })
    return warningRows.size
  }, [activeScopeIndices, validationResults])

  const selectedRowsErrorCount = blockingErrorCount
  const errorCount = blockingErrorCount

  return {
    // state
    file, setFile,
    importing, setImporting,
    validating, setValidating,
    validationResults, setValidationResults,
    previewData, setPreviewData,
    importResult, setImportResult,
    importType, setImportType,
    currentPage, setCurrentPage,
    columnValidationError, setColumnValidationError,
    selectedRows, setSelectedRows,
    shouldDeleteBeforeImport, setShouldDeleteBeforeImport,
    deleteMode, setDeleteMode,
    showConfirmDialog, setShowConfirmDialog,
    pendingImport, setPendingImport,
    importProgress, setImportProgress,
    deleteProgress, setDeleteProgress,
    isDeleting, setIsDeleting,
    isImportCancelled, setIsImportCancelled,
    conflictResolution, setConflictResolution,
    dbConflicts, setDbConflicts,
    showPreviewModal, setShowPreviewModal,
    validationFilter, setValidationFilter,

    // refs
    cancelImportRef,

    // computed
    rowsPerPage,
    activeScopeIndices,
    errorCount,
    selectedRowsErrorCount,
    blockingErrorCount,
    warningRowCountInScope,
    errorRowCount,
    warningRowCount,
    visibleRowIndices,
    isAllSelected,
    isSomeSelected,

    // props (pass through)
    initialImportType, onImportSuccess, isInModal, hideTypeSelector,

    // handlers
    handleFileChange,
    handleDrop,
    handleDragOver,
    handleCancel,
    validateData,
    importData,
    executeImport,
    cancelImport,
    handleFilterChange,
    exportValidationReport,
    toggleRowSelection,
    toggleSelectAll,
    updateConflictChoice,
    getRowIssues,
    getOrderedColumns,
    getCellErrors,
    isCellEmpty,
  }
}
