// T019: thin wrapper delegating to /finance tab components
// Route /payroll-deductions → /finance?tab=payroll (App.tsx redirect)
// T041b will delete this file after T034 confirms redirects work
import Layout from '@/components/layout/Layout'
import PayrollRunsTab from './finance/PayrollRunsTab'
import ObligationsTab from './finance/ObligationsTab'
import DeductionsTab from './finance/DeductionsTab'
import { useState } from 'react'

type ActiveTab = 'runs' | 'obligations' | 'deductions'

const TAB_LABELS: Record<ActiveTab, string> = {
  runs: 'مسيرات الرواتب',
  obligations: 'الالتزامات',
  deductions: 'الاستقطاعات والجزاءات',
}

export default function PayrollDeductions() {
  const [activePageTab, setActivePageTab] = useState<ActiveTab>('runs')

  return (
    <Layout>
      <div dir="rtl" className="space-y-4">
        <div className="flex gap-2 border-b border-border-200 pb-3">
          {(Object.keys(TAB_LABELS) as ActiveTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActivePageTab(tab)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activePageTab === tab
                  ? 'bg-primary text-white shadow-sm'
                  : 'border border-border-200 bg-surface text-foreground-secondary hover:bg-surface-secondary-50'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {activePageTab === 'runs' && <PayrollRunsTab />}
        {activePageTab === 'obligations' && <ObligationsTab />}
        {activePageTab === 'deductions' && <DeductionsTab />}
      </div>
    </Layout>
  )
}
