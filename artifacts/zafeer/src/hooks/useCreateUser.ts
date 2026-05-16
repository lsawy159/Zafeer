import { useCreateAdminUser } from '@workspace/api-client-react'
import { useAuth } from '@/contexts/AuthContext'

export function useCreateUser() {
  const { session } = useAuth()

  return useCreateAdminUser({
    request: {
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ''}`,
      },
    },
  })
}
