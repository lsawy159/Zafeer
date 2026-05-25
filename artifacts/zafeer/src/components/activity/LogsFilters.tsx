import { RefreshCw, Search } from 'lucide-react'
import { MultiSelectDropdown } from '@/components/ui/MultiSelectDropdown'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'

type ActionFilterValue = 'create' | 'update' | 'delete' | 'login'
type EntityFilterValue = 'employee' | 'company' | 'user' | 'settings'
type DateFilter = 'all' | 'today' | 'week' | 'month'
type ActivitySortField = 'created_at' | 'action' | 'entity_type'
type SortDirection = 'asc' | 'desc'

interface LogsFiltersProps {
  searchTerm: string
  onSearchTermChange: (value: string) => void
  actionFilter: ActionFilterValue[]
  onActionFilterChange: (value: ActionFilterValue[]) => void
  entityFilter: EntityFilterValue[]
  onEntityFilterChange: (value: EntityFilterValue[]) => void
  dateFilter: DateFilter
  onDateFilterChange: (value: DateFilter) => void
  sortField: ActivitySortField
  onSortFieldChange: (value: ActivitySortField) => void
  sortDirection: SortDirection
  onSortDirectionChange: (value: SortDirection) => void
  hasActiveFilters: boolean
  onReset: () => void
}

const ACTION_OPTIONS: Array<{ value: ActionFilterValue; label: string }> = [
  { value: 'create', label: 'إنشاء' },
  { value: 'update', label: 'تحديث' },
  { value: 'delete', label: 'حذف' },
  { value: 'login', label: 'دخول / خروج' },
]

const ENTITY_OPTIONS: Array<{ value: EntityFilterValue; label: string }> = [
  { value: 'employee', label: 'موظفين' },
  { value: 'company', label: 'مؤسسات' },
  { value: 'user', label: 'مستخدمين' },
  { value: 'settings', label: 'إعدادات' },
]

const SORT_FIELD_OPTIONS: Array<{ value: ActivitySortField; label: string }> = [
  { value: 'created_at', label: 'تاريخ الإنشاء' },
  { value: 'action', label: 'نوع الإجراء' },
  { value: 'entity_type', label: 'نوع الكيان' },
]

const SORT_DIRECTION_OPTIONS: Array<{ value: SortDirection; label: string }> = [
  { value: 'desc', label: 'تنازلي' },
  { value: 'asc', label: 'تصاعدي' },
]

export function LogsFilters(props: LogsFiltersProps) {
  const {
    searchTerm,
    onSearchTermChange,
    actionFilter,
    onActionFilterChange,
    entityFilter,
    onEntityFilterChange,
    dateFilter,
    onDateFilterChange,
    sortField,
    onSortFieldChange,
    sortDirection,
    onSortDirectionChange,
    hasActiveFilters,
    onReset,
  } = props

  return (
    <div className="app-filter-surface mb-6 p-3 sm:p-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-900">الفلاتر</h3>
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-purple-50 transition"
            >
              <RefreshCw className="w-3 h-3" />
              إعادة تعيين
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 sm:w-5 h-4 sm:h-5" />
              <input
                type="text"
                placeholder="البحث..."
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
                className="w-full pr-9 sm:pr-10 pl-3 sm:pl-4 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <MultiSelectDropdown
              options={ACTION_OPTIONS}
              selected={actionFilter}
              onChange={onActionFilterChange}
              placeholder="جميع أنواع الإجراءات"
            />
          </div>

          <div>
            <MultiSelectDropdown
              options={ENTITY_OPTIONS}
              selected={entityFilter}
              onChange={onEntityFilterChange}
              placeholder="جميع أنواع الكيانات"
            />
          </div>

          <div>
            <Select value={dateFilter} onValueChange={(value) => onDateFilterChange(value as DateFilter)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="جميع التواريخ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع التواريخ</SelectItem>
                <SelectItem value="today">اليوم</SelectItem>
                <SelectItem value="week">أسبوع</SelectItem>
                <SelectItem value="month">شهر</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <Select
              value={sortField}
              onValueChange={(value) => onSortFieldChange(value as ActivitySortField)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="ترتيب حسب" />
              </SelectTrigger>
              <SelectContent>
                {SORT_FIELD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select
              value={sortDirection}
              onValueChange={(value) => onSortDirectionChange(value as SortDirection)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="اتجاه الترتيب" />
              </SelectTrigger>
              <SelectContent>
                {SORT_DIRECTION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  )
}
