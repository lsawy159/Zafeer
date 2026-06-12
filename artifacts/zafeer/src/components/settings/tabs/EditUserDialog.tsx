import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { useUpdateUserProfile } from '@/hooks/useUpdateUserProfile'
import { supabase } from '@/lib/supabase'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'

interface EditUserDialogProps {
  userId: string | null
  userName: string
  currentFullName: string
  currentRole: string
  onClose: () => void
}

const schema = z.object({
  full_name: z.string().min(1, 'الاسم مطلوب'),
  role: z.enum(['manager', 'user']),
  new_password: z.string().refine(v => v === '' || v.length >= 8, {
    message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
  }),
  confirm_password: z.string(),
}).refine(d => d.new_password === d.confirm_password, {
  message: 'كلمتا المرور غير متطابقتين',
  path: ['confirm_password'],
})

type FormData = z.infer<typeof schema>

export function EditUserDialog({
  userId,
  userName,
  currentFullName,
  currentRole,
  onClose,
}: EditUserDialogProps) {
  const queryClient = useQueryClient()
  const mutation = useUpdateUserProfile()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: currentFullName,
      role: (currentRole === 'manager' ? 'manager' : 'user') as FormData['role'],
      new_password: '',
      confirm_password: '',
    },
    values: {
      full_name: currentFullName,
      role: (currentRole === 'manager' ? 'manager' : 'user') as FormData['role'],
      new_password: '',
      confirm_password: '',
    },
  })

  const selectedRole = watch('role')

  const handleClose = () => {
    reset()
    onClose()
  }

  const onSubmit = async (data: FormData) => {
    if (!userId) return
    try {
      await mutation.mutateAsync({
        id: userId,
        data: {
          full_name: data.full_name,
          role: data.role,
        },
      })

      if (data.new_password) {
        const { error: pwError } = await supabase.functions.invoke('admin-users', {
          body: { id: userId, password: data.new_password },
          headers: { 'x-action': 'reset-password' },
        })
        if (pwError) {
          let message = pwError.message
          if (pwError instanceof FunctionsHttpError) {
            try {
              const body = await pwError.context.json()
              if (typeof body?.error === 'string') message = body.error
            } catch { /* keep generic */ }
          }
          throw new Error(message)
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('تم التحديث بنجاح')
      handleClose()
    } catch (error) {
      logger.error('Update user failed:', error)
      toast.error(error instanceof Error ? error.message : 'فشل تحديث البيانات')
    }
  }

  return (
    <Dialog open={userId !== null} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">تعديل بيانات المستخدم</DialogTitle>
          <DialogDescription className="text-right">
            {userName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-right block">الاسم الكامل</label>
            <Input
              placeholder="الاسم الكامل"
              {...register('full_name')}
              disabled={isSubmitting}
            />
            {errors.full_name && (
              <p className="text-xs text-red-600 text-right">{errors.full_name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-right block">الدور</label>
            <Select
              value={selectedRole}
              onValueChange={(val) => setValue('role', val as FormData['role'])}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر الدور" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">مستخدم</SelectItem>
                <SelectItem value="manager">مسؤول</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-xs text-red-600 text-right">{errors.role.message}</p>
            )}
          </div>

          <div className="border-t border-border-100 pt-3 space-y-3">
            <p className="text-xs text-foreground-tertiary text-right">تغيير كلمة المرور (اختياري — اتركها فارغة للإبقاء على الحالية)</p>
            <div className="space-y-1">
              <label className="text-sm font-medium text-right block">كلمة المرور الجديدة</label>
              <Input
                type="password"
                placeholder="8 أحرف على الأقل"
                {...register('new_password')}
                disabled={isSubmitting}
                autoComplete="new-password"
              />
              {errors.new_password && (
                <p className="text-xs text-red-600 text-right">{errors.new_password.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-right block">تأكيد كلمة المرور</label>
              <Input
                type="password"
                placeholder="أعد كتابة كلمة المرور"
                {...register('confirm_password')}
                disabled={isSubmitting}
                autoComplete="new-password"
              />
              {errors.confirm_password && (
                <p className="text-xs text-red-600 text-right">{errors.confirm_password.message}</p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 flex-row-reverse sm:flex-row-reverse">
            <Button type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <LoadingSpinner className="h-4 w-4" /> : 'حفظ'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
