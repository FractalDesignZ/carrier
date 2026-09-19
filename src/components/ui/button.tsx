import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-fg hover:bg-fg",
        ghost: "bg-transparent text-fg hover:bg-surface-2",
        outline: "border border-line bg-transparent text-fg hover:bg-surface-2",
        quiet: "bg-surface-2 text-fg hover:bg-line",
      },
      size: {
        default: "h-11 px-4 text-sm rounded-[10px]",
        sm: "h-9 px-3 text-xs rounded-lg",
        icon: "size-11 rounded-[10px]",
        pill: "h-9 px-3 text-xs rounded-full",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
