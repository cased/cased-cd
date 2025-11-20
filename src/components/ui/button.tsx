import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        solid: "shadow",
        outline: "border shadow-sm bg-background",
        ghost: "",
        link: "underline-offset-4 hover:underline",
      },
      color: {
        primary: "",
        destructive: "",
        secondary: "",
        neutral: "",
      },
      size: {
        default: "h-8 px-3 py-1",
        sm: "h-6 rounded px-2 text-[11px]",
        lg: "h-8 rounded px-6",
        icon: "h-7 w-7",
      },
    },
    compoundVariants: [
      // Solid variants
      {
        variant: "solid",
        color: "primary",
        class: "bg-primary text-primary-foreground hover:bg-primary/90",
      },
      {
        variant: "solid",
        color: "destructive",
        class: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      {
        variant: "solid",
        color: "secondary",
        class: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      },
      {
        variant: "solid",
        color: "neutral",
        class: "bg-muted text-muted-foreground hover:bg-muted/80",
      },
      // Outline variants
      {
        variant: "outline",
        color: "primary",
        class: "border-primary text-primary bg-transparent hover:bg-primary/10",
      },
      {
        variant: "outline",
        color: "destructive",
        class: "border-destructive text-destructive bg-transparent hover:bg-destructive/10",
      },
      {
        variant: "outline",
        color: "secondary",
        class: "border-secondary text-secondary-foreground bg-transparent hover:bg-secondary/80",
      },
      {
        variant: "outline",
        color: "neutral",
        class: "border-input text-foreground bg-transparent hover:bg-accent hover:text-accent-foreground",
      },
      // Ghost variants
      {
        variant: "ghost",
        color: "primary",
        class: "text-primary hover:bg-primary/10",
      },
      {
        variant: "ghost",
        color: "destructive",
        class: "text-destructive hover:bg-destructive/10",
      },
      {
        variant: "ghost",
        color: "secondary",
        class: "text-secondary-foreground hover:bg-secondary/80",
      },
      {
        variant: "ghost",
        color: "neutral",
        class: "text-foreground hover:bg-accent hover:text-accent-foreground",
      },
      // Link variants
      {
        variant: "link",
        color: "primary",
        class: "text-primary",
      },
      {
        variant: "link",
        color: "destructive",
        class: "text-destructive",
      },
      {
        variant: "link",
        color: "secondary",
        class: "text-secondary-foreground",
      },
      {
        variant: "link",
        color: "neutral",
        class: "text-foreground",
      },
    ],
    defaultVariants: {
      variant: "solid",
      color: "primary",
      size: "default",
    },
  }
);

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color">,
    Omit<ButtonVariantProps, "variant" | "color"> {
  asChild?: boolean;
  /**
   * Visual style of the button.
   * Accepts new style names ("solid", "outline", "ghost", "link")
   * or legacy variants ("default", "destructive", "secondary") which map to styles+colors.
   */
  variant?: ButtonVariantProps["variant"] | "default" | "destructive" | "secondary";
  /**
   * Color scheme of the button.
   * If not provided, defaults based on the variant for backward compatibility.
   */
  color?: ButtonVariantProps["color"];
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "solid", color, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    // Map legacy variants to new variant/color combinations
    let finalVariant: ButtonVariantProps["variant"] = "solid";
    let finalColor: ButtonVariantProps["color"] = color;

    switch (variant) {
      // Legacy mappings
      case "default":
        finalVariant = "solid";
        finalColor = color ?? "primary";
        break;
      case "destructive":
        finalVariant = "solid";
        finalColor = color ?? "destructive";
        break;
      case "secondary":
        finalVariant = "solid";
        finalColor = color ?? "secondary";
        break;
      
      // Style mappings (preserving legacy defaults if color is missing)
      case "outline":
        finalVariant = "outline";
        finalColor = color ?? "neutral";
        break;
      case "ghost":
        finalVariant = "ghost";
        finalColor = color ?? "neutral";
        break;
      case "link":
        finalVariant = "link";
        finalColor = color ?? "primary";
        break;
      
      // Direct new usage
      case "solid":
        finalVariant = "solid";
        finalColor = color ?? "primary";
        break;
      default:
        // Fallback for any other passed value (should be a valid style)
        finalVariant = variant as ButtonVariantProps["variant"];
        finalColor = color ?? "primary";
        break;
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant: finalVariant, color: finalColor, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
