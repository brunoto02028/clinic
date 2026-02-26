import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-[#4a7c8a] to-[#2c4f58] text-white shadow-md shadow-[#4a7c8a]/20 hover:shadow-lg hover:shadow-[#4a7c8a]/25 hover:-translate-y-0.5",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md shadow-red-500/20 hover:shadow-lg",
        outline:
          "border border-[#6ba3b0]/30 bg-transparent text-[#6ba3b0] hover:bg-[#6ba3b0]/10 hover:border-[#6ba3b0]/50 hover:shadow-[0_0_15px_rgba(107,163,176,0.08)] transition-all",
        secondary:
          "bg-[#4a7c8a]/10 text-[#6ba3b0] border border-[#4a7c8a]/20 hover:bg-[#4a7c8a]/20 hover:border-[#6ba3b0]/40 shadow-sm hover:shadow-md transition-all",
        ghost: "hover:bg-white/5 hover:text-foreground",
        link: "text-[#6ba3b0] underline-offset-4 hover:underline hover:text-[#8aaab5]",
        success:
          "bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-500/20 hover:shadow-lg",
        warning:
          "bg-amber-500 text-white hover:bg-amber-400 shadow-md shadow-amber-500/20 hover:shadow-lg",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-lg px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
