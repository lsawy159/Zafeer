import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface AdhkarDisplaySettings {
  display_duration_ms: number
}

const DEFAULTS: AdhkarDisplaySettings = {
  display_duration_ms: 8000,
}

const MIN_DISPLAY_MS = 2000

export function clampAdhkarSettings(raw: Partial<AdhkarDisplaySettings>): AdhkarDisplaySettings {
  return {
    display_duration_ms: Math.max(
      typeof raw.display_duration_ms === 'number' && raw.display_duration_ms > 0
        ? raw.display_duration_ms
        : DEFAULTS.display_duration_ms,
      MIN_DISPLAY_MS
    ),
  }
}

export const ADHKAR_SETTINGS_KEY = ['adhkar', 'settings'] as const

export function useAdhkarSettings() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ADHKAR_SETTINGS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'adhkar_display')
        .single()
      if (error) return DEFAULTS
      return clampAdhkarSettings((data?.setting_value ?? {}) as Partial<AdhkarDisplaySettings>)
    },
    staleTime: 5 * 60 * 1000,
  })

  const updateSettings = async (next: Partial<AdhkarDisplaySettings>) => {
    const clamped = clampAdhkarSettings({ ...(query.data ?? DEFAULTS), ...next })
    const { error } = await supabase
      .from('system_settings')
      .update({ setting_value: clamped, updated_at: new Date().toISOString() })
      .eq('setting_key', 'adhkar_display')
    if (error) throw error
    await queryClient.invalidateQueries({ queryKey: ADHKAR_SETTINGS_KEY })
  }

  return {
    settings: query.data ?? DEFAULTS,
    isLoading: query.isLoading,
    updateSettings,
  }
}
