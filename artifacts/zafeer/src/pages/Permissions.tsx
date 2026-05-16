import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { CheckSquare, Edit2, Pencil, Save, Shield, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'

import Layout from '@/components/layout/Layout'
import PermissionGuard from '@/components/PermissionGuard'
import { RoleBadge } from '@/components/ui/StatusBadge'
import { CreateUserDialog } from '@/components/settings/tabs/CreateUserDialog'
import { EditUserDialog } from '@/components/settings/tabs/EditUserDialog'
import { useAuth } from '@/contexts/AuthContext'
import { useUpdateUserProfile } from '@/hooks/useUpdateUserProfile'
import { supabase, type User } from '@/lib/supabase'
import { normalizePermissionsFlat } from '@/utils/permissions'
import {
  ACTION_LABELS,
  PERMISSION_SECTIONS,
  VALID_PERMISSION_SECTIONS,
} from '@/utils/PERMISSIONS_SCHEMA'

type PermissionRowUser = Pick<
  User,
  'id' | 'full_name' | 'username' | 'email' | 'role' | 'permissions' | 'is_active'
>

const permissionKeySchema = z.string().refine((value) => {
  const [section, action] = value.split('.')
  if (!section || !action) {
    return false
  }

  const validSection = VALID_PERMISSION_SECTIONS.includes(
    section as keyof typeof PERMISSION_SECTIONS
  )
  if (!validSection) {
    return false
  }

  return PERMISSION_SECTIONS[section as keyof typeof PERMISSION_SECTIONS].actions.includes(
    action as never
  )
}, 'صلاحية غير صحيحة')

const updatePermissionsSchema = z.object({
  userId: z.string().uuid('معرف المستخدم غير صحيح'),
  permissions: z.array(permissionKeySchema),
})

async function fetchUsersForPermissions(): Promise<PermissionRowUser[]> {
  const { data, error } = await supabase.rpc('get_all_users_for_admin')

  if (error) {
    throw error
  }

  return (data || []) as PermissionRowUser[]
}

interface PermissionsPanelProps {
  embedded?: boolean
}

export function PermissionsPanel({ embedded = true }: PermissionsPanelProps) {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()
  const updateProfile = useUpdateUserProfile()
  const [editingUser, setEditingUser] = useState<PermissionRowUser | null>(null)
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editUserId, setEditUserId] = useState<string | null>(null)
  const [editUserName, setEditUserName] = useState('')
  const [editUserFullName, setEditUserFullName] = useState('')
  const [editUserRole, setEditUserRole] = useState('')

  const usersQuery = useQuery({
    queryKey: ['users', 'permissions'],
    queryFn: fetchUsersForPermissions,
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: { userId: string; permissions: string[] }) => {
      const parsed = updatePermissionsSchema.safeParse(payload)
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message || 'بيانات غير صحيحة')
      }

      const { error } = await supabase.rpc('update_user_as_admin', {
        p_user_id: payload.userId,
        p_new_permissions: payload.permissions,
      })

      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      toast.success('تم تحديث الصلاحيات بنجاح')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setEditingUser(null)
      setSelectedPermissions([])
    },
    onError: (error: Error) => {
      toast.error(error.message || 'فشل تحديث الصلاحيات')
    },
  })

  const availablePermissionKeys = useMemo(() => {
    return VALID_PERMISSION_SECTIONS.flatMap((section) => {
      return PERMISSION_SECTIONS[section].actions.map((action) => `${section}.${action}`)
    })
  }, [])

  const openEditDialog = (user: PermissionRowUser) => {
    setEditingUser(user)
    setSelectedPermissions(normalizePermissionsFlat(user.permissions, user.role))
  }

  const togglePermission = (permission: string) => {
    setSelectedPermissions((prev) => {
      if (prev.includes(permission)) {
        return prev.filter((item) => item !== permission)
      }
      return [...prev, permission]
    })
  }

  const handleSave = () => {
    if (!editingUser) {
      return
    }

    updateMutation.mutate({
      userId: editingUser.id,
      permissions: selectedPermissions.filter((permission) =>
        availablePermissionKeys.includes(permission)
      ),
    })
  }

  const content = (
    <PermissionGuard permissions={['users.view']}>
      <div className={embedded ? '' : 'p-6'}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">إدارة الصلاحيات</h1>
            <p className="text-sm text-foreground-secondary">
              عدّل صلاحيات كل مستخدم حسب الأقسام المطلوبة له فقط.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateDialog(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-foreground transition hover:opacity-90"
          >
            <UserPlus className="h-4 w-4" />
            إضافة مستخدم
          </button>
        </div>

        {usersQuery.isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border-200 bg-surface">
            <table className="w-full min-w-[760px]">
              <thead className="bg-surface-secondary-50 text-xs font-semibold text-foreground-secondary">
                <tr>
                  <th className="px-4 py-3 text-right">المستخدم</th>
                  <th className="px-4 py-3 text-right">الدور</th>
                  <th className="px-4 py-3 text-right">الحالة</th>
                  <th className="px-4 py-3 text-right">عدد الصلاحيات</th>
                  <th className="px-4 py-3 text-right">الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {(usersQuery.data || []).map((user) => {
                  const flatPermissions = normalizePermissionsFlat(user.permissions, user.role)

                  return (
                    <tr key={user.id} className="border-t border-border-100 text-sm text-foreground-secondary">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{user.full_name}</div>
                        <div className="text-xs text-foreground-tertiary">{user.username}</div>
                      </td>
                      <td className="px-4 py-3">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                        >
                          {user.is_active ? 'نشط' : 'غير نشط'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{flatPermissions.length}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditDialog(user)}
                            className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-primary/20"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            الصلاحيات
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditUserId(user.id)
                              setEditUserName(user.full_name || user.username || '')
                              setEditUserFullName(user.full_name || '')
                              setEditUserRole(user.role || 'user')
                            }}
                            disabled={user.id === currentUser?.id}
                            className="inline-flex items-center gap-2 rounded-lg border border-border-200 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-surface-secondary-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            تعديل
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              updateProfile.mutate(
                                { id: user.id, data: { is_active: !user.is_active } },
                                {
                                  onSuccess: () => {
                                    queryClient.invalidateQueries({ queryKey: ['users'] })
                                    toast.success(user.is_active ? 'تم تعطيل الحساب' : 'تم تفعيل الحساب')
                                  },
                                  onError: () => toast.error('فشل تغيير حالة الحساب'),
                                }
                              )
                            }}
                            disabled={user.id === currentUser?.id || updateProfile.isPending}
                            className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                              user.is_active
                                ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                                : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                            }`}
                          >
                            {user.is_active ? 'تعطيل' : 'تفعيل'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {editingUser && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
            onClick={() => setEditingUser(null)}
          >
            <div
              className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-border-100 bg-surface shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border-100 px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground">تعديل صلاحيات المستخدم</h2>
                  <p className="text-xs text-foreground-tertiary">
                    {editingUser.full_name} - {editingUser.username}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-lg p-1.5 text-foreground-tertiary transition hover:bg-surface-secondary-100 hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[65vh] overflow-y-auto p-5">
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <Shield className="mr-1 inline h-3.5 w-3.5" />
                  حدّد فقط الصلاحيات التي يحتاجها المستخدم فعليًا.
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {VALID_PERMISSION_SECTIONS.map((section) => (
                    <div
                      key={section}
                      className="rounded-xl border border-border-200 bg-surface-secondary-50/60 p-3"
                    >
                      <h3 className="mb-2 text-sm font-semibold text-foreground">
                        {PERMISSION_SECTIONS[section].label}
                      </h3>
                      <p className="mb-2 text-xs text-foreground-tertiary">
                        {PERMISSION_SECTIONS[section].description}
                      </p>
                      <div className="space-y-1.5">
                        {PERMISSION_SECTIONS[section].actions.map((action) => {
                          const permissionKey = `${section}.${action}`
                          const checked = selectedPermissions.includes(permissionKey)

                          return (
                            <label
                              key={permissionKey}
                              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 hover:bg-surface"
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-border-300 text-primary focus:ring-primary"
                                checked={checked}
                                onChange={() => togglePermission(permissionKey)}
                              />
                              <span className="inline-flex items-center gap-1 text-xs text-foreground-secondary">
                                <CheckSquare className="h-3.5 w-3.5 text-foreground-tertiary" />
                                {ACTION_LABELS[action]}
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border-100 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-lg border border-border-300 px-4 py-2 text-sm font-medium text-foreground-secondary transition hover:bg-surface-secondary-50"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ الصلاحيات'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <CreateUserDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />

      <EditUserDialog
        userId={editUserId}
        userName={editUserName}
        currentFullName={editUserFullName}
        currentRole={editUserRole}
        onClose={() => setEditUserId(null)}
      />
    </PermissionGuard>
  )

  if (embedded) {
    return content
  }

  return <Layout>{content}</Layout>
}

export default function Permissions() {
  return <PermissionsPanel embedded={false} />
}
