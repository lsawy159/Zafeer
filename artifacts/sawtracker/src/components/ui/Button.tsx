import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-[var(--duration-normal)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.96]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-primary-800)] text-white shadow-md hover:bg-[var(--color-primary-700)] hover:shadow-[var(--shadow-primary)]",
        destructive:
          "bg-[var(--color-danger-500)] text-white hover:bg-[var(--color-danger-600)]",
        outline:
          "border border-[var(--color-neutral-300)] bg-transparent text-foreground hover:bg-muted",
        secondary:
          "border border-[var(--color-neutral-300)] bg-surface text-foreground hover:bg-muted hover:border-[var(--color-neutral-400)]",
        ghost: "bg-transparent text-foreground hover:bg-muted",
        link: "text-[var(--color-primary-800)] underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-9 px-4 py-2",
        sm: "min-h-8 rounded-full px-3 text-xs",
        lg: "min-h-10 rounded-full px-8",
        icon: "h-9 w-9 rounded-full p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
