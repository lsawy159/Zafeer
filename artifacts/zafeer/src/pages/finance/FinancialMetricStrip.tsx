import type { ReactNode } from 'react'
import { StatCard } from '@/components/ui/StatCard'

export interface FinancialMetric {
  label: string
  value: string | number
  helper?: string
  icon?: ReactNode
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
}

const accentMap: Record<NonNullable<FinancialMetric['tone']>, 'neutral' | 'success' | 'warning' | 'danger'> = {
  neutral: 'neutral',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
}

export default function FinancialMetricStrip({ metrics }: { metrics: FinancialMetric[] }) {
  if (metrics.length === 0) return null

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <StatCard
          key={metric.label}
          title={metric.label}
          value={metric.value}
          icon={metric.icon}
          accent={accentMap[metric.tone ?? 'neutral']}
          trendLabel={metric.helper}
          className="shadow-[var(--shadow-sm)]"
        />
      ))}
    </div>
  )
}
