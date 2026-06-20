import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface AdhkarItem {
  id: string
  text: string
  is_active: boolean
  sort_order: number
}

export const ADHKAR_ACTIVE_KEY = ['adhkar', 'active'] as const
export const ADHKAR_ALL_KEY = ['adhkar', 'all'] as const

export function useAdhkar() {
  return useQuery({
    queryKey: ADHKAR_ACTIVE_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('adhkar')
        .select('id,text,is_active,sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return (data ?? []) as AdhkarItem[]
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useAllAdhkar() {
  return useQuery({
    queryKey: ADHKAR_ALL_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('adhkar')
        .select('id,text,is_active,sort_order,created_at,updated_at')
        .order('sort_order', { ascending: true })
      if (error) throw error
      return (data ?? []) as AdhkarItem[]
    },
    staleTime: 2 * 60 * 1000,
  })
}
