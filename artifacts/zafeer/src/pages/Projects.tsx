import { useEffect, useState, useCallback, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase, Project } from '@/lib/supabase'
import Layout from '@/components/layout/Layout'
import ProjectModal from '@/components/projects/ProjectModal'
import ProjectCard from '@/components/projects/ProjectCard'
import ProjectDetailModal from '@/components/projects/ProjectDetailModal'
import ProjectStatistics from '@/components/projects/ProjectStatistics'
import { FolderKanban, Plus, Shield, ArrowUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { usePermissions } from '@/utils/permissions'
import { useCardColumns } from '@/hooks/useUiPreferences'
import { PageHeader } from '@/components/ui/PageHeader'
import { FilterBar } from '@/components/ui/FilterBar'
import { SearchInput } from '@/components/ui/SearchInput'
import { Button } from '@/components/ui/Button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { useDeleteAdminProject, ConflictResponse } from '@workspace/api-client-react'

type SortField = 'name' | 'created_at' | 'status' | 'employee_count' | 'total_salaries'
type SortDirection = 'asc' | 'desc'
type ProjectStatus = 'all' | 'active' | 'inactive' | 'completed'
type ProjectStatusFilter = Exclude<ProjectStatus, 'all'>
type ActiveTab = 'list' | 'statistics'

const PROJECT_STATUS_OPTIONS: Array<{ value: ProjectStatusFilter; label: string }> = [
  { value: 'active', label: 'نشط' },
  { value: 'inactive', label: 'متوقف' },
  { value: 'completed', label: 'مكتمل' },
]

const PROJECT_STATUS_LABELS: Record<ProjectStatusFilter, string> = {
  active: 'نشط',
  inactive: 'متوقف',
  completed: 'مكتمل',
}

function getStatusFilterLabel(selected: ProjectStatusFilter[]) {
  if (selected.length === 0) return 'جميع الحالات'
  if (selected.length === PROJECT_STATUS_OPTIONS.length) return 'جميع الحالات'
  if (selected.length <= 2) return selected.map((status) => PROJECT_STATUS_LABELS[status]).join('، ')
  return `${selected.length} حالات مختارة`
}

const compareNullableNumbers = (
  left: number | null | undefined,
  right: number | null | undefined
) => {
  if (left == null && right == null) return 0
  if (left == null) return 1
  if (right == null) return -1
  return left - right
}

export default function Projects() {
  const { canView, canCreate } = usePermissions()
  const location = useLocation()
  const [projects, setProjects] = useState<
    (Project & { employee_count: number; total_salaries: number })[]
  >([])
  const [filteredProjects, setFilteredProjects] = useState<
    (Project & { employee_count: number; total_salaries: number })[]
  >([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ActiveTab>('list')

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [extractCount, setExtractCount] = useState(0)

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter[]>([])

  // Sort states
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const { gridClass: projectGridClass } = useCardColumns()

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true)

      // جلب المشاريع غير المحذوفة فقط
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id,name,description,status,created_at,updated_at')
        .eq('is_deleted', false)
        .order('name')

      if (projectsError) throw projectsError

      // جلب الموظفين النشطين فقط
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('project_id, salary')
        .or('is_deleted.is.null,is_deleted.eq.false')

      if (employeesError) throw employeesError

      // حساب الإحصائيات لكل مشروع
      const projectsWithStats = (projectsData || []).map((project) => {
        const projectEmployees = (employees || []).filter((emp) => emp.project_id === project.id)
        const employee_count = projectEmployees.length
        const total_salaries = projectEmployees.reduce((sum, emp) => sum + (emp.salary || 0), 0)

        return {
          ...project,
          employee_count,
          total_salaries,
        }
      })

      setProjects(projectsWithStats)
    } catch (error) {
      console.error('Error loading projects:', error)
      toast.error('حدث خطأ أثناء تحميل المشاريع')
    } finally {
      setLoading(false)
    }
  }, [])

  // Deep-link: ?open=PROJECT_ID → open project detail modal directly
  const openProjectHandledRef = useRef(false)
  useEffect(() => {
    if (openProjectHandledRef.current || loading || projects.length === 0) return
    const openId = new URLSearchParams(location.search).get('open')
    if (!openId) return
    const project = projects.find((p) => p.id === openId)
    if (project) {
      setSelectedProject(project)
      setShowDetailModal(true)
      openProjectHandledRef.current = true
    }
  }, [projects, loading, location.search])

  const applyFiltersAndSort = useCallback(() => {
    let filtered = [...projects]

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (project) =>
          project.name.toLowerCase().includes(searchLower) ||
          project.description?.toLowerCase().includes(searchLower)
      )
    }

    // Apply status filter
    if (statusFilter.length > 0) {
      filtered = filtered.filter((project) =>
        statusFilter.includes((project.status ?? '') as Exclude<ProjectStatus, 'all'>)
      )
    }

    // Apply sort
    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'ar')
          break
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '', 'ar')
          break
        case 'employee_count':
          comparison = compareNullableNumbers(a.employee_count, b.employee_count)
          break
        case 'total_salaries':
          comparison = compareNullableNumbers(a.total_salaries, b.total_salaries)
          break
        default:
          comparison = 0
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    setFilteredProjects(filtered)
  }, [projects, searchTerm, statusFilter, sortField, sortDirection])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  useEffect(() => {
    applyFiltersAndSort()
  }, [applyFiltersAndSort])

  const handleAddProject = () => {
    setSelectedProject(null)
    setShowAddModal(true)
  }

  const handleEditProject = (project: Project) => {
    setSelectedProject(project)
    setShowEditModal(true)
  }

  const handleDeleteProject = async (project: Project) => {
    setSelectedProject(project)

    // Fetch extract count for this project
    try {
      const { data: extracts, error } = await supabase
        .from('extract_invoices')
        .select('id')
        .eq('project_id', project.id)

      if (!error && extracts) {
        setExtractCount(extracts.length)
      }
    } catch (err) {
      console.error('Error fetching extracts:', err)
      setExtractCount(0)
    }

    setShowDeleteModal(true)
  }

  const handleViewProject = (
    project: Project & { employee_count?: number; total_salaries?: number }
  ) => {
    setSelectedProject(project)
    setShowDetailModal(true)
  }

  const deleteProjectMutation = useDeleteAdminProject()

  const handleDeleteConfirm = async () => {
    if (!selectedProject) return

    try {
      setLoading(true)
      const response = await deleteProjectMutation.mutateAsync({ id: selectedProject.id })

      if (response && typeof response === 'object' && 'success' in response && response.success === true) {
        toast.success('تم حذف المشروع بنجاح')
        loadProjects()
        setShowDeleteModal(false)
        setSelectedProject(null)
      } else {
        toast.error('فشل حذف المشروع - رد خادم غير متوقع')
        console.error('Unexpected response format:', response)
      }
    } catch (error) {
      console.error('Error deleting project:', error)

      if (error instanceof Error) {
        const errorMsg = error.message
        const status = 'status' in error && typeof error.status === 'number' ? error.status : undefined

        if (errorMsg.includes('active employees')) {
          toast.error('لا يمكن حذف المشروع لأنه يحتوي على موظفين نشطين')
        } else if (status === 401 || status === 403 || errorMsg.includes('401') || errorMsg.includes('403')) {
          toast.error('ليس لديك صلاحية لحذف المشروع')
        } else if (status === 404 || errorMsg.includes('404')) {
          toast.error('المشروع غير موجود')
        } else {
          toast.error(`خطأ: ${errorMsg}`)
        }
      } else {
        toast.error('حدث خطأ أثناء حذف المشروع')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleModalClose = () => {
    setShowAddModal(false)
    setShowEditModal(false)
    setShowDeleteModal(false)
    setShowDetailModal(false)
    setSelectedProject(null)
  }

  const handleModalSuccess = async () => {
    handleModalClose()
    await loadProjects()
  }

  if (loading && projects.length === 0) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    )
  }

  // التحقق من الصلاحية بدون إرجاع مبكر للحفاظ على ترتيب الـ Hooks
  const hasViewPermission = canView('projects')

  return (
    <Layout>
      {!hasViewPermission ? (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-danger-500" />
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">غير مصرح</h2>
            <p className="text-neutral-600">عذراً، ليس لديك صلاحية لعرض هذه الصفحة.</p>
          </div>
        </div>
      ) : (
        <div className="app-page app-tech-grid">
          <PageHeader
            title="المشاريع"
            description="إدارة المشاريع وعرض الإحصائيات بنفس الهوية الموحدة."
            breadcrumbs={[{ label: 'الرئيسية', href: '/dashboard' }, { label: 'المشاريع' }]}
            actions={
              canCreate('projects') ? (
                <Button onClick={handleAddProject}>
                  <Plus className="w-4 h-4" />
                  إضافة مشروع جديد
                </Button>
              ) : undefined
            }
          />

          {/* Tabs */}
          <div className="app-toggle-shell w-fit">
            <button
              onClick={() => setActiveTab('list')}
              className={`app-toggle-button ${activeTab === 'list' ? 'app-toggle-button-active' : ''}`}
            >
              قائمة المشاريع
            </button>
            <button
              onClick={() => setActiveTab('statistics')}
              className={`app-toggle-button ${activeTab === 'statistics' ? 'app-toggle-button-active' : ''}`}
            >
              إحصائيات المشاريع
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'list' ? (
            <div className="space-y-4">
              {/* Filters */}
              <FilterBar>
                <SearchInput
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ابحث عن مشروع..."
                  wrapperClassName="min-w-[220px] flex-1"
                />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" className="h-9 px-3 text-sm">
                      <span className="truncate max-w-[130px]">{getStatusFilterLabel(statusFilter)}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" sideOffset={8} className="w-44">
                    <DropdownMenuLabel>اختر الحالة</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => setStatusFilter([])}>جميع الحالات</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {PROJECT_STATUS_OPTIONS.map((option) => (
                      <DropdownMenuCheckboxItem
                        key={option.value}
                        checked={statusFilter.includes(option.value)}
                        onCheckedChange={() =>
                          setStatusFilter((current) =>
                            current.includes(option.value)
                              ? current.filter((status) => status !== option.value)
                              : [...current, option.value]
                          )
                        }
                        onSelect={(event) => event.preventDefault()}
                      >
                        {option.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" className="h-9 w-9 px-0" title="الترتيب">
                      <ArrowUpDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={8} className="w-52">
                    <DropdownMenuLabel>الترتيب</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup
                      value={`${sortField}_${sortDirection}`}
                      onValueChange={(value) => {
                        const parts = value.split('_')
                        const dir = parts.pop() as SortDirection
                        setSortField(parts.join('_') as SortField)
                        setSortDirection(dir)
                      }}
                    >
                      <DropdownMenuRadioItem value="name_asc">الاسم (أ-ي)</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="name_desc">الاسم (ي-أ)</DropdownMenuRadioItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioItem value="employee_count_desc">عدد الموظفين (الأكثر)</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="employee_count_asc">عدد الموظفين (الأقل)</DropdownMenuRadioItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioItem value="total_salaries_desc">إجمالي الرواتب (الأكبر)</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="total_salaries_asc">إجمالي الرواتب (الأصغر)</DropdownMenuRadioItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioItem value="created_at_desc">الأحدث</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="created_at_asc">الأقدم</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </FilterBar>

              {/* Projects Grid */}
              {filteredProjects.length === 0 ? (
                <div className="text-center py-12 bg-surface rounded-lg border border-neutral-200">
                  <FolderKanban className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
                  <p className="text-neutral-600">لا توجد مشاريع</p>
                  {searchTerm || statusFilter.length > 0 ? (
                    <p className="text-sm text-neutral-500 mt-2">جرب تغيير الفلاتر</p>
                  ) : (
                    canCreate('projects') && (
                      <Button onClick={handleAddProject} className="mt-4">
                        إضافة مشروع جديد
                      </Button>
                    )
                  )}
                </div>
              ) : (
                <div className={projectGridClass}>
                  {filteredProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onEdit={handleEditProject}
                      onDelete={handleDeleteProject}
                      onView={handleViewProject}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <ProjectStatistics />
          )}

          {/* Modals */}
          {showAddModal && (
            <ProjectModal
              isOpen={showAddModal}
              project={null}
              onClose={handleModalClose}
              onSuccess={handleModalSuccess}
            />
          )}

          {showEditModal && selectedProject && (
            <ProjectModal
              isOpen={showEditModal}
              project={selectedProject}
              onClose={handleModalClose}
              onSuccess={handleModalSuccess}
            />
          )}

          {/* Project Detail Modal */}
          {showDetailModal && selectedProject && (
            <ProjectDetailModal
              project={
                selectedProject as Project & { employee_count?: number; total_salaries?: number }
              }
              onClose={handleModalClose}
              onEdit={handleEditProject}
              onDelete={handleDeleteProject}
              onEmployeeChange={loadProjects}
            />
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteModal && selectedProject && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
              onClick={handleModalClose}
            >
              <div className="bg-surface rounded-lg shadow-xl max-w-md w-full p-6" onClick={(event) => event.stopPropagation()}>
                <h3 className="text-lg font-bold text-neutral-900 mb-4">تأكيد حذف المشروع</h3>
                <div className="space-y-4 mb-6">
                  <p className="text-neutral-700">
                    هل أنت متأكد من حذف المشروع <span className="font-semibold">"{selectedProject.name}"</span>؟
                  </p>

                  {extractCount > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-900">
                        🔍 يوجد <span className="font-semibold">{extractCount}</span> مستخلص{extractCount > 1 ? 'ات' : ''} متعلق{extractCount > 1 ? 'ة' : ''} بهذا المشروع
                      </p>
                      <p className="text-xs text-blue-800 mt-2">
                        ✓ المستخلصات سيتم الاحتفاظ بها كسجل تاريخي ولن تُحذف
                      </p>
                    </div>
                  )}

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs text-amber-900">
                      ⚠️ سيتم إزالة المشروع من قائمة المشاريع التشغيلية فقط، بينما ستبقى جميع السجلات المالية والتاريخية محفوظة
                    </p>
                  </div>

                  <p className="text-sm text-red-600 font-medium">
                    ⚠️ لا يمكن التراجع عن هذا الإجراء
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <Button onClick={handleModalClose} variant="secondary">
                    إلغاء
                  </Button>
                  <Button onClick={handleDeleteConfirm} variant="destructive">
                    حذف المشروع
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}
