import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface SnoozedAlertRecord {
  id: number
  user_id: string
  alert_id: string
  snoozed_until: string | null
  is_deferred: boolean
  created_at: string
}

export interface SnoozeAlertInput {
  alertId: string
  snoozedUntil?: Date | null
  isDeferred?: boolean
}

async function fetchSnoozedAlertsQuery(): Promise<SnoozedAlertRecord[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from('snoozed_alerts')
    .select('id,user_id,alert_id,snoozed_until,is_deferred,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  const now = new Date()
  return ((data ?? []) as SnoozedAlertRecord[]).filter(
    (alert) => alert.is_deferred === true || (!!alert.snoozed_until && new Date(alert.snoozed_until) > now)
  )
}

export function useSnoozedAlerts() {
  const queryClient = useQueryClient()

  const snoozedAlertsQuery = useQuery<SnoozedAlertRecord[]>({
    queryKey: ['snoozed-alerts'],
    queryFn: fetchSnoozedAlertsQuery,
    staleTime: 30 * 1000,
    refetchInterval: 2 * 60 * 1000,
    retry: 2,
  })

  const snoozedAlerts = snoozedAlertsQuery.data ?? []

  const snoozedAlertIds = useMemo(
    () => new Set(snoozedAlerts.map((alert) => alert.alert_id)),
    [snoozedAlerts]
  )

  const snoozedAlertsById = useMemo(
    () => new Map(snoozedAlerts.map((alert) => [alert.alert_id, alert] as const)),
    [snoozedAlerts]
  )

  const refreshSnoozedAlerts = () => {
    void queryClient.invalidateQueries({ queryKey: ['snoozed-alerts'] })
  }

  const upsertMutation = useMutation({
    mutationFn: async ({ alertId, snoozedUntil, isDeferred }: SnoozeAlertInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('المستخدم غير مسجل دخول')
      }

      const payload = {
        user_id: user.id,
        alert_id: alertId,
        snoozed_until: isDeferred ? null : snoozedUntil?.toISOString() ?? null,
        is_deferred: Boolean(isDeferred),
      }

      const { error } = await supabase.from('snoozed_alerts').upsert(payload, {
        onConflict: 'user_id,alert_id',
      })

      if (error) {
        throw error
      }

      return payload
    },
    onMutate: async ({ alertId, snoozedUntil, isDeferred }) => {
      await queryClient.cancelQueries({ queryKey: ['snoozed-alerts'] })

      const previousAlerts = queryClient.getQueryData<SnoozedAlertRecord[]>(['snoozed-alerts']) ?? []
      const nextRecord: SnoozedAlertRecord = {
        id: Number.MAX_SAFE_INTEGER,
        user_id: '',
        alert_id: alertId,
        snoozed_until: isDeferred ? null : snoozedUntil?.toISOString() ?? null,
        is_deferred: Boolean(isDeferred),
        created_at: new Date().toISOString(),
      }

      queryClient.setQueryData<SnoozedAlertRecord[]>(['snoozed-alerts'], (current = []) => {
        const withoutCurrent = current.filter((item) => item.alert_id !== alertId)
        return [nextRecord, ...withoutCurrent]
      })

      return { previousAlerts }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousAlerts) {
        queryClient.setQueryData(['snoozed-alerts'], context.previousAlerts)
      }
    },
    onSuccess: () => {
      refreshSnoozedAlerts()
    },
  })

  const unsnoozeMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('المستخدم غير مسجل دخول')
      }

      const { error } = await supabase
        .from('snoozed_alerts')
        .delete()
        .eq('user_id', user.id)
        .eq('alert_id', alertId)

      if (error) {
        throw error
      }

      return alertId
    },
    onMutate: async (alertId) => {
      await queryClient.cancelQueries({ queryKey: ['snoozed-alerts'] })

      const previousAlerts = queryClient.getQueryData<SnoozedAlertRecord[]>(['snoozed-alerts']) ?? []
      queryClient.setQueryData<SnoozedAlertRecord[]>(['snoozed-alerts'], (current = []) =>
        current.filter((item) => item.alert_id !== alertId)
      )

      return { previousAlerts }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousAlerts) {
        queryClient.setQueryData(['snoozed-alerts'], context.previousAlerts)
      }
    },
    onSuccess: () => {
      refreshSnoozedAlerts()
    },
  })

  return {
    snoozedAlerts,
    snoozedAlertIds,
    snoozedAlertsById,
    isLoading: snoozedAlertsQuery.isLoading,
    isFetching: snoozedAlertsQuery.isFetching,
    refreshSnoozedAlerts,
    snoozeAlert: (input: SnoozeAlertInput) => upsertMutation.mutateAsync(input),
    unsnoozeAlert: (alertId: string) => unsnoozeMutation.mutateAsync(alertId),
  }
}
