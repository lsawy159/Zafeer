import { useMutation } from '@tanstack/react-query'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type ResetPasswordVariables = {
  id: string
  data: {
    password: string
  }
}

export function useForceResetPassword() {
  return useMutation({
    mutationFn: async ({ id, data }: ResetPasswordVariables) => {
      const { data: result, error } = await supabase.functions.invoke('admin-users', {
        body: { id, password: data.password },
        headers: {
          'x-action': 'reset-password',
        },
      })

      if (error) {
        let message: string = error.message
        if (error instanceof FunctionsHttpError) {
          try {
            const body = await error.context.json()
            if (typeof body?.error === 'string') message = body.error
          } catch { /* keep generic message */ }
        }
        throw new Error(message)
      }

      if (result?.error) {
        throw new Error(result.error)
      }

      return result as { success: true }
    },
  })
}
