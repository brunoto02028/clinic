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
          "bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md shadow-red-500/20 hover:shadow-lg",
        outline:
          "border border-primary/30 bg-transparent text-primary hover:bg-primary/10 hover:border-primary/50 hover:shadow-[0_0_15px_hsl(var(--primary)/0.08)] transition-all",
        secondary:
          "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 hover:border-primary/40 shadow-sm hover:shadow-md transition-all",
        ghost: "hover:bg-white/5 hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/70",
        success:
          "bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-500/20 hover:shadow-lg",
        warning:
          "bg-amber-500 text-white hover:bg-amber-400 shadow-md shadow-amber-500/20 hover:shadow-lg",
        // BA1 Design System v4 — public-site only, additive (does not affect admin/dashboard)
        ba1Primary:
          "bg-[#CDC7BE] text-[#26221C] hover:bg-[#BFB8AD] font-['Sora'] shadow-sm hover:shadow-md transition-all",
        ba1Dark:
          "bg-[#20242D] text-white hover:bg-[#2C313C] font-['Sora'] shadow-sm hover:shadow-md transition-all",
        ba1Outline:
          "bg-white border-[1.5px] border-[#E4E3DF] text-[#20242D] hover:border-[#4F7361]/40 hover:bg-[#EDF3EF]/40 transition-all",
        ba1Health:
          "bg-[#4F7361] text-white hover:bg-[#436154] font-['Sora'] shadow-sm hover:shadow-md transition-all",
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
