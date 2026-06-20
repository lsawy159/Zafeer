import { SkipBack, SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip'
import { useAdhkarContext } from '@/contexts/AdhkarContext'
import { useIsMobileView } from '@/hooks/useIsMobileView'

interface SidebarAdhkarControlsProps {
  isCollapsed: boolean
}

export function SidebarAdhkarControls({ isCollapsed }: SidebarAdhkarControlsProps) {
  const { current, next, prev } = useAdhkarContext()
  const isMobile = useIsMobileView()

  if (isMobile) return null

  const btnBase = 'rounded-lg p-1.5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
  const btnIdle = 'text-muted-foreground hover:bg-muted hover:text-foreground'

  const PrevBtn = (
    <button onClick={prev} className={cn(btnBase, btnIdle)} type="button" aria-label="الذكر السابق">
      <SkipBack className="w-3.5 h-3.5" />
    </button>
  )

  const NextBtn = (
    <button onClick={next} className={cn(btnBase, btnIdle)} type="button" aria-label="الذكر التالي">
      <SkipForward className="w-3.5 h-3.5" />
    </button>
  )

  if (isCollapsed) {
    return (
      <div className="border-t border-border px-2 py-2 flex flex-col items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>{PrevBtn}</TooltipTrigger>
          <TooltipContent side="right">السابق</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>{NextBtn}</TooltipTrigger>
          <TooltipContent side="right">التالي</TooltipContent>
        </Tooltip>
      </div>
    )
  }

  return (
    <div className="border-t border-border px-3 py-3">
      {current ? (
        <p className="text-3xl leading-relaxed text-foreground mb-2.5 line-clamp-4 text-right" dir="rtl" data-testid="sidebar-adhkar-text">
          {current.text}
        </p>
      ) : (
        <p className="text-3xl text-muted-foreground mb-2.5 text-right">لا توجد أذكار مفعّلة</p>
      )}
      <div className="flex items-center justify-center gap-2">
        {PrevBtn}
        {NextBtn}
      </div>
    </div>
  )
}
