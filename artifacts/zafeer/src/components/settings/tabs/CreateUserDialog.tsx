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
import { useCreateUser } from '@/hooks/useCreateUser'
import { toast } from 'sonner'
import { logger } from '@/utils/logger'

interface CreateUserDialogProps {
  open: boolean
  onClose: () => void
}

const schema = z
  .object({
    full_name: z.string().min(1, 'الاسم مطلوب'),
    email: z.string().email('بريد إلكتروني غير صالح'),
    password: z.string().min(8, 'كلمة المرور 8 أحرف على الأقل'),
    confirmPassword: z.string(),
    role: z.enum(['manager', 'user']).default('user'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'كلمتا المرور غير متطابقتين',
    path: ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>

export function CreateUserDialog({ open, onClose }: CreateUserDialogProps) {
  const queryClient = useQueryClient()
  const mutation = useCreateUser()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'user' },
  })

  const selectedRole = watch('role')

  const handleClose = () => {
    reset()
    onClose()
  }

  const onSubmit = async (data: FormData) => {
    try {
      await mutation.mutateAsync({
        data: {
          full_name: data.full_name,
          email: data.email,
          password: data.password,
          role: data.role,
        },
      })
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('تم إنشاء الحساب بنجاح')
      handleClose()
    } catch (error) {
      logger.error('Create user failed:', error)
      toast.error(error instanceof Error ? error.message : 'فشل إنشاء الحساب')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">إضافة مستخدم جديد</DialogTitle>
          <DialogDescription className="text-right">
            أدخل بيانات الحساب الجديد — سيتمكن المستخدم من تسجيل الدخول فور الإنشاء.
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
            <label className="text-sm font-medium text-right block">البريد الإلكتروني</label>
            <Input
              type="email"
              placeholder="example@domain.com"
              dir="ltr"
              {...register('email')}
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="text-xs text-red-600 text-right">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-right block">كلمة المرور</label>
            <Input
              type="password"
              placeholder="8 أحرف على الأقل"
              autoComplete="new-password"
              {...register('password')}
              disabled={isSubmitting}
            />
            {errors.password && (
              <p className="text-xs text-red-600 text-right">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-right block">تأكيد كلمة المرور</label>
            <Input
              type="password"
              placeholder="أعد كتابة كلمة المرور"
              autoComplete="new-password"
              {...register('confirmPassword')}
              disabled={isSubmitting}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-red-600 text-right">{errors.confirmPassword.message}</p>
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

          <DialogFooter className="gap-2 pt-2 flex-row-reverse sm:flex-row-reverse">
            <Button type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <LoadingSpinner className="h-4 w-4" /> : 'إنشاء'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
