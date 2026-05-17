import { getInputValue } from '@/utils/errorHandling'
import { Input } from '@/components/ui/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'

export interface GeneralSetting {
  id?: string
  setting_key: string
  setting_value: string | number | boolean | Record<string, unknown> | null
  category: string
  description: string
  setting_type: 'text' | 'number' | 'boolean' | 'select' | 'time'
  options?: string[]
}

interface SettingControlProps {
  setting: GeneralSetting
  value: string | number | boolean | Record<string, unknown> | null | undefined
  disabled: boolean
  onChange: (key: string, value: string | number | boolean | Record<string, unknown> | null) => void
}

export function SettingControl({ setting, value, disabled, onChange }: SettingControlProps) {
  const resolvedValue = value ?? setting.setting_value

  switch (setting.setting_type) {
    case 'text':
      return (
        <Input
          type="text"
          value={getInputValue(resolvedValue)}
          onChange={(e) => onChange(setting.setting_key, e.target.value)}
          disabled={disabled}
          className="disabled:cursor-not-allowed disabled:bg-surface-secondary-100"
        />
      )

    case 'number':
      return (
        <Input
          type="number"
          value={getInputValue(resolvedValue)}
          onChange={(e) => onChange(setting.setting_key, Number(e.target.value))}
          disabled={disabled}
          className="disabled:cursor-not-allowed disabled:bg-surface-secondary-100"
        />
      )

    case 'boolean':
      return (
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={!!resolvedValue}
            onChange={(e) => onChange(setting.setting_key, e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-border-300 text-primary focus:ring-primary disabled:cursor-not-allowed"
          />
          <span className="mr-2 text-sm text-foreground-secondary">{resolvedValue ? 'مفعل' : 'معطل'}</span>
        </label>
      )

    case 'select':
      return (
        <Select
          value={getInputValue(resolvedValue)}
          onValueChange={(selectedValue) => onChange(setting.setting_key, selectedValue)}
          disabled={disabled}
        >
          <SelectTrigger className="disabled:cursor-not-allowed disabled:bg-surface-secondary-100">
            <SelectValue placeholder="اختر قيمة" />
          </SelectTrigger>
          <SelectContent>
            {setting.options?.map((option) => {
              if (option === null || option === undefined) {
                return null
              }

              if (typeof option === 'object') {
                const optionObject = option as { label?: string; value?: unknown } | null
                if (!optionObject) {
                  return null
                }

                const optionValue = String(optionObject.value ?? '')
                const optionLabel = String(optionObject.label ?? optionValue)

                return (
                  <SelectItem key={optionValue} value={optionValue}>
                    {optionLabel}
                  </SelectItem>
                )
              }

              return (
                <SelectItem key={String(option)} value={String(option)}>
                  {String(option)}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      )

    case 'time':
      return (
        <Input
          type="time"
          value={getInputValue(resolvedValue)}
          onChange={(e) => onChange(setting.setting_key, e.target.value)}
          disabled={disabled}
          className="disabled:cursor-not-allowed disabled:bg-surface-secondary-100"
        />
      )

    default:
      return null
  }
}
