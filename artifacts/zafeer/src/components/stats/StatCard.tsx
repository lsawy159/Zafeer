import { type ReactNode } from 'react'

interface StatCardProps {
  label: string
  count: number
  color: 'green' | 'red' | 'orange' | 'yellow' | 'gray' | 'blue'
  onClick?: () => void
  icon?: ReactNode
  badge?: string
  loading?: boolean
}

const colorMap: Record<StatCardProps['color'], string> = {
  green:  'border-r-4 border-green-500  text-green-700  bg-green-50',
  red:    'border-r-4 border-red-500    text-red-700    bg-red-50',
  orange: 'border-r-4 border-orange-500 text-orange-700 bg-orange-50',
  yellow: 'border-r-4 border-yellow-500 text-yellow-700 bg-yellow-50',
  gray:   'border-r-4 border-gray-400   text-gray-700   bg-gray-50',
  blue:   'border-r-4 border-blue-500   text-blue-700   bg-blue-50',
}

const countColorMap: Record<StatCardProps['color'], string> = {
  green:  'text-green-600',
  red:    'text-red-600',
  orange: 'text-orange-600',
  yellow: 'text-yellow-600',
  gray:   'text-gray-600',
  blue:   'text-blue-600',
}

export default function StatCard({ label, count, color, onClick, icon, badge, loading }: StatCardProps) {
  if (loading) {
    return (
      <div className="app-panel p-3 animate-pulse">
        <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-6 bg-gray-200 rounded w-1/3" />
      </div>
    )
  }

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
      className={[
        'app-panel p-3 select-none transition-all duration-150',
        colorMap[color],
        onClick ? 'cursor-pointer hover:brightness-95 hover:shadow-md active:scale-[0.99]' : '',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="shrink-0 opacity-70">{icon}</span>}
          <span className="text-xs font-medium leading-tight truncate">{label}</span>
        </div>
        {badge && (
          <span className="shrink-0 text-[10px] bg-white/60 border border-current/20 rounded px-1.5 py-0.5 leading-none">
            {badge}
          </span>
        )}
      </div>
      <div className={`text-2xl font-bold mt-1 ${countColorMap[color]}`}>
        {count.toLocaleString('ar-SA')}
      </div>
    </div>
  )
}
