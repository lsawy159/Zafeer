import { lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'

const Extracts = lazy(() => import('@/pages/Extracts'))
const CreateExtractWizard = lazy(() => import('@/pages/extracts/CreateExtractWizard'))
const ExtractDetail = lazy(() => import('@/pages/extracts/ExtractDetail'))

const Loading = () => (
  <div className="py-8 text-center text-sm text-foreground-tertiary">جاري التحميل...</div>
)

export default function ExtractsTab() {
  const [searchParams, setSearchParams] = useSearchParams()
  const action = searchParams.get('action')
  const extractId = searchParams.get('id')

  const goToList = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('action')
      next.delete('id')
      return next
    })
  }

  if (action === 'new') {
    return (
      <Suspense fallback={<Loading />}>
        <CreateExtractWizard embedded onCancel={goToList} />
      </Suspense>
    )
  }

  if (extractId) {
    return (
      <Suspense fallback={<Loading />}>
        <ExtractDetail extractId={extractId} onBack={goToList} />
      </Suspense>
    )
  }

  // قائمة المستخلصات — navigate('/extracts/new') → redirect → /finance?tab=extracts&action=new
  return (
    <Suspense fallback={<Loading />}>
      <Extracts />
    </Suspense>
  )
}
