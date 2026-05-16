import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useForceResetPassword } from '@/hooks/useForceResetPassword'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'

interface PasswordResetDialogProps {
  userId: string | null
  userName: string
  onClose: () => void
}

const schema = z
  .object({
    newPassword: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'كلمتا المرور غير متطابقتين',
    path: ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>

export function PasswordResetDialog({ userId, userName, onClose }: PasswordResetDialogProps) {
  const mutation = useForceResetPassword()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const handleClose = () => {
    reset()
    onClose()
  }

  const onSubmit = async (data: FormData) => {
    if (!userId) return
    try {
      await mutation.mutateAsync({ id: userId, data: { password: data.newPassword } })
      toast.success('تم تعيين كلمة المرور بنجاح')
      handleClose()
    } catch (error) {
      logger.error('Force password reset failed:', error)
      toast.error(error instanceof Error ? error.message : 'فشل تعيين كلمة المرور')
    }
  }

  return (
    <Dialog open={userId !== null} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">إعادة تعيين كلمة المرور</DialogTitle>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 text-right">
            {userName}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-right block">كلمة المرور الجديدة</label>
            <Input
              type="password"
              placeholder="8 أحرف على الأقل"
              {...register('newPassword')}
              disabled={isSubmitting}
            />
            {errors.newPassword && (
              <p className="text-xs text-red-600 text-right">{errors.newPassword.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-right block">تأكيد كلمة المرور</label>
            <Input
              type="password"
              placeholder="أعد كتابة كلمة المرور"
              {...register('confirmPassword')}
              disabled={isSubmitting}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-red-600 text-right">{errors.confirmPassword.message}</p>
            )}
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
