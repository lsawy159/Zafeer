import PayrollRunsSection from './PayrollRunsSection'
import PayrollEntriesSection from './PayrollEntriesSection'

export default function PayrollRunsTab() {
  return (
    <div className="space-y-8" dir="rtl">
      <PayrollRunsSection />
      <hr className="border-border-200" />
      <PayrollEntriesSection />
    </div>
  )
}
