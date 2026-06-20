import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { ADHKAR_ACTIVE_KEY, ADHKAR_ALL_KEY } from '@/hooks/useAdhkar'

export function useAdhkarCrud() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isBusy, setIsBusy] = useState(false)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['adhkar'] })

  const createAdhkar = async (payload: {
    text: string
    sort_order: number
    is_active: boolean
  }) => {
    setIsBusy(true)
    try {
      const { error } = await supabase.from('adhkar').insert({
        ...payload,
        created_by: user?.id ?? null,
      })
      if (error) throw error
      await invalidate()
    } finally {
      setIsBusy(false)
    }
  }

  const updateAdhkar = async (
    id: string,
    payload: Partial<{ text: string; sort_order: number; is_active: boolean }>
  ) => {
    setIsBusy(true)
    try {
      const { error } = await supabase
        .from('adhkar')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      await invalidate()
    } finally {
      setIsBusy(false)
    }
  }

  const removeAdhkar = async (id: string) => {
    setIsBusy(true)
    try {
      const { error } = await supabase.from('adhkar').delete().eq('id', id)
      if (error) throw error
      await invalidate()
    } finally {
      setIsBusy(false)
    }
  }

  return { createAdhkar, updateAdhkar, removeAdhkar, isBusy }
}

// re-export query keys for convenience
export { ADHKAR_ACTIVE_KEY, ADHKAR_ALL_KEY }
