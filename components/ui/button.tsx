import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive shadow-sm active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-white hover:bg-primary/90 border border-primary/20 active:shadow-[0_0_18px_rgba(34,211,238,0.45)]",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 border border-destructive/30 active:shadow-[0_0_14px_rgba(248,113,113,0.35)]",
        outline:
          "border-2 bg-background shadow-xs hover:bg-accent hover:text-accent-foreground text-slate-100 dark:bg-slate-900/80 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:border-slate-600",
        secondary:
          "bg-secondary text-white hover:bg-secondary/80 border border-secondary/20 active:shadow-[0_0_14px_rgba(34,211,238,0.3)]",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-slate-800 text-slate-100",
        link: "text-primary underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
