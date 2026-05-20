import { useProjects } from '@/hooks/useProjects'
import { AlertTriangle } from 'lucide-react'

interface StepSelectProjectProps {
  selectedProjectId: string | null
  onSelect: (projectId: string) => void
}

export default function StepSelectProject({ selectedProjectId, onSelect }: StepSelectProjectProps) {
  const { data: projects = [], isLoading } = useProjects()
  const activeProjects = projects.filter((p) => p.status === 'active')

  if (isLoading) {
    return <div className="py-8 text-center text-slate-500">جاري تحميل المشاريع...</div>
  }

  if (activeProjects.length === 0) {
    return (
      <div className="py-8 text-center text-slate-500">
        <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
        <p>لا توجد مشاريع نشطة</p>
      </div>
    )
  }

  return (
    <div className="space-y-2" dir="rtl">
      <p className="text-sm text-slate-600 mb-4">اختر المشروع الذي سيُنشأ له المستخلص</p>
      <div className="grid gap-2">
        {activeProjects.map((project) => (
          <button
            key={project.id}
            onClick={() => onSelect(project.id)}
            className={`w-full text-right px-4 py-3 rounded-lg border-2 transition-all ${
              selectedProjectId === project.id
                ? 'border-primary bg-primary/5 text-primary font-medium'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
            }`}
          >
            {project.name}
          </button>
        ))}
      </div>
    </div>
  )
}
