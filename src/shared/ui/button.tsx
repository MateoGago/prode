import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";

import { cn } from "@/shared/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
        // Cancha Pop signature 3D tactile controls. They opt out of the base
        // `active:translate-y-px` nudge in favour of the deeper 5px press, and
        // restyle the press shadow so the button physically "sinks".
        pop: "rounded-pill bg-primary text-primary-foreground shadow-3d transition-[transform,box-shadow] duration-[120ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] active:not-aria-[haspopup]:translate-y-[5px] active:shadow-3d-press hover:brightness-105 disabled:grayscale disabled:shadow-none",
        "pop-gol":
          "rounded-pill bg-gol text-primary-foreground shadow-3d transition-[transform,box-shadow] duration-[120ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] active:not-aria-[haspopup]:translate-y-[5px] active:shadow-3d-press hover:brightness-105 disabled:grayscale disabled:shadow-none",
        "pop-ghost":
          "rounded-pill border-border bg-background text-foreground ring-1 ring-inset ring-border shadow-[0_4px_0_var(--border)] transition-[transform,box-shadow] duration-[120ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] active:not-aria-[haspopup]:translate-y-[4px] active:shadow-none hover:bg-muted disabled:grayscale disabled:shadow-none",
        "pop-danger":
          "rounded-pill bg-destructive text-white shadow-3d-danger transition-[transform,box-shadow] duration-[120ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] active:not-aria-[haspopup]:translate-y-[5px] active:shadow-3d-danger-press hover:brightness-105 disabled:grayscale disabled:shadow-none",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
