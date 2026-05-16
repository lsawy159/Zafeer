import { useUpdateAdminUser } from '@workspace/api-client-react'
import { useAuth } from '@/contexts/AuthContext'

export function useUpdateUserProfile() {
  const { session } = useAuth()

  return useUpdateAdminUser({
    request: {
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ''}`,
      },
    },
  })
}
