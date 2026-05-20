import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useProjects } from '@/hooks/useProjects'
import Layout from '@/components/layout/Layout'
import type { MatchedEmployee } from '@/utils/extractCalculations'
import StepSelectProject from './steps/StepSelectProject'
import StepSelectPeriod from './steps/StepSelectPeriod'
import StepReviewEmployees from './steps/StepReviewEmployees'
import StepUploadAttendance from './steps/StepUploadAttendance'
import StepPreviewExport from './steps/StepPreviewExport'

const STEP_LABELS = [
  'اختيار المشروع',
  'الفترة الزمنية',
  'مراجعة الموظفين',
  'رفع الحضور',
  'المراجعة النهائية',
]

export default function CreateExtractWizard() {
  const navigate = useNavigate()
  const { data: projects = [] } = useProjects()

  const [step, setStep] = useState(1)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [periodMonth, setPeriodMonth] = useState<string | null>(null)
  const [totalDays, setTotalDays] = useState<number | null>(null)
  const [matchedRows, setMatchedRows] = useState<MatchedEmployee[]>([])

  const selectedProject = projects.find((p) => p.id === projectId)

  const handleSelectProject = (id: string) => {
    setProjectId(id)
    setStep(2)
  }

  const handleSelectPeriod = (month: string, days: number) => {
    setPeriodMonth(month)
    setTotalDays(days)
    setStep(3)
  }

  const handleReviewProceed = () => setStep(4)

  const handleMatchComplete = (rows: MatchedEmployee[]) => {
    setMatchedRows(rows)
    setStep(5)
  }

  const goToStep = (target: number) => {
    if (target < step) setStep(target)
  }

  return (
    <Layout>
    <div className="max-w-2xl mx-auto py-6 px-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/extracts')}
          className="text-slate-500 hover:text-slate-700 transition"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-slate-900">مستخلص جديد</h1>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1
          const active = n === step
          const done = n < step
          return (
            <div key={n} className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => goToStep(n)}
                disabled={!done}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition ${
                  active
                    ? 'bg-primary text-white'
                    : done
                    ? 'text-primary cursor-pointer hover:bg-primary/10'
                    : 'text-slate-400 cursor-default'
                }`}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                  active ? 'bg-white text-primary' : done ? 'bg-primary/20 text-primary' : 'bg-slate-200 text-slate-500'
                }`}>
                  {n}
                </span>
                {label}
              </button>
              {i < STEP_LABELS.length - 1 && (
                <div className={`h-px w-4 ${done ? 'bg-primary' : 'bg-slate-200'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step content */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800 mb-4">
          {STEP_LABELS[step - 1]}
        </h2>

        {step === 1 && (
          <StepSelectProject
            selectedProjectId={projectId}
            onSelect={handleSelectProject}
          />
        )}

        {step === 2 && projectId && (
          <StepSelectPeriod
            projectId={projectId}
            periodMonth={periodMonth}
            totalDays={totalDays}
            onSelect={handleSelectPeriod}
          />
        )}

        {step === 3 && projectId && (
          <StepReviewEmployees
            projectId={projectId}
            onProceed={handleReviewProceed}
            onGoToRates={() => navigate('/projects')}
          />
        )}

        {step === 4 && projectId && totalDays !== null && (
          <StepUploadAttendance
            projectId={projectId}
            projectName={selectedProject?.name ?? ''}
            totalDaysInMonth={totalDays}
            onMatchComplete={handleMatchComplete}
          />
        )}

        {step === 5 && projectId && periodMonth && totalDays !== null && (
          <StepPreviewExport
            projectId={projectId}
            periodMonth={periodMonth}
            totalDaysInMonth={totalDays}
            initialRows={matchedRows}
          />
        )}
      </div>
    </div>
    </Layout>
  )
}
