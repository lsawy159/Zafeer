import { useEffect, useState } from 'react'
import { Settings } from 'lucide-react'
import { checkMaintenanceActive } from '@/lib/restoreService'

export function MaintenanceScreen() {
  const [dots, setDots] = useState('.')

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => (d.length >= 3 ? '.' : d + '.'))
    }, 600)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-neutral-900/95 backdrop-blur-sm text-white">
      <div className="text-center space-y-6 max-w-md px-6">
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-orange-400 opacity-30 animate-ping" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Settings className="w-10 h-10 text-orange-400 animate-spin" style={{ animationDuration: '3s' }} />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-white mb-2">
            النظام في وضع الصيانة{dots}
          </h1>
          <p className="text-neutral-300 text-lg">
            جارٍ استعادة البيانات
          </p>
          <p className="text-neutral-400 text-sm mt-3">
            يُرجى الانتظار حتى تكتمل العملية. سيعود النظام تلقائياً.
          </p>
        </div>

        <div className="w-full h-1 bg-neutral-700 rounded-full overflow-hidden">
          <div className="h-full bg-orange-400 rounded-full animate-[loading_2s_ease-in-out_infinite]" style={{ width: '60%', animation: 'pulse 2s ease-in-out infinite' }} />
        </div>
      </div>
    </div>
  )
}

// Self-polling wrapper — polls every 10s; caller hides this when inactive
export function MaintenanceScreenWithPolling({ currentUserId }: { currentUserId?: string }) {
  const [isActive, setIsActive] = useState(false)
  const [executorId, setExecutorId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      const active = await checkMaintenanceActive()
      if (cancelled) return
      setIsActive(active)

      if (active) {
        // Read executor_id from system_settings to decide if current user is the executor
        try {
          const { supabase } = await import('@/lib/supabase')
          const { data } = await supabase
            .from('system_settings')
            .select('setting_value')
            .eq('setting_key', 'maintenance_mode')
            .single()

          if (!cancelled && data?.setting_value) {
            const val = typeof data.setting_value === 'object' ? data.setting_value as Record<string, unknown> : {}
            setExecutorId(typeof val.executor_id === 'string' ? val.executor_id : null)
          }
        } catch { /* ignore */ }
      }
    }

    check()
    const interval = setInterval(check, 10_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  // Show for non-executor users only
  if (!isActive || (currentUserId && executorId && currentUserId === executorId)) return null

  return <MaintenanceScreen />
}
