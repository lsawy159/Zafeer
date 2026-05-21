import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { checkMaintenanceActive } from '@/lib/restoreService'

interface MaintenanceModeState {
  active: boolean
  executorId: string | null
}

export function useMaintenanceMode(currentUserId?: string): MaintenanceModeState {
  const [state, setState] = useState<MaintenanceModeState>({ active: false, executorId: null })

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      const active = await checkMaintenanceActive()
      if (cancelled) return

      if (!active) {
        setState({ active: false, executorId: null })
        return
      }

      try {
        const { data } = await supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'maintenance_mode')
          .single()

        if (cancelled) return

        const val = data?.setting_value as Record<string, unknown> | null
        const executorId = typeof val?.executor_id === 'string' ? val.executor_id : null
        setState({ active: true, executorId })
      } catch {
        setState({ active: true, executorId: null })
      }
    }

    check()
    const interval = setInterval(check, 10_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [currentUserId])

  return state
}
