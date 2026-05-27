import { ChevronDown } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover'
import { cn } from '@/lib/utils'

interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectDropdownProps {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder: string
  className?: string
}

function getCountLabel(placeholder: string, count: number): string {
  if (placeholder === 'جميع المؤسسات') return `${count} مؤسسات`
  if (placeholder === 'جميع المشاريع') return `${count} مشاريع`
  if (placeholder === 'جميع الجنسيات') return `${count} جنسيات`
  if (placeholder === 'جميع المهن') return `${count} مهن`
  if (placeholder === 'جميع الأولويات' || placeholder === 'الأولويات') return `${count} أولويات`
  if (placeholder.startsWith('جميع حالات')) return `${count} حالات`
  if (placeholder === 'جميع الأنواع') return `${count} أنواع`
  return `${count} عناصر`
}

export function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder,
  className,
}: MultiSelectDropdownProps) {
  const selectedSet = new Set(selected)

  const selectedLabel =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? options.find((opt) => opt.value === selected[0])?.label ?? selected[0]
        : getCountLabel(placeholder, selected.length)

  const handleToggle = (value: string) => {
    if (selectedSet.has(value)) {
      onChange(selected.filter((item) => item !== value))
      return
    }
    onChange([...selected, value])
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'focus-ring-brand w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-right',
            'flex items-center justify-between gap-2',
            className
          )}
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-neutral-500" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="z-[10000] w-[var(--radix-popover-trigger-width)] p-2">
        <div className="max-h-60 space-y-1 overflow-y-auto">
          {options.map((option) => {
            const checked = selectedSet.has(option.value)
            return (
              <label
                key={option.value}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                  checked ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                )}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary-600"
                  checked={checked}
                  onChange={() => handleToggle(option.value)}
                />
                <span className="truncate">{option.label}</span>
              </label>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
