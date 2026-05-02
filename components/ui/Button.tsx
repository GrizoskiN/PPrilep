"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "../../lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "teal";
  size?: "sm" | "md";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", className, children, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none",
          size === "sm" ? "px-4 py-2 text-sm" : "px-5 py-2.5 text-sm",
          variant === "primary" && "bg-slate-900 text-white hover:bg-slate-800",
          variant === "teal" && "bg-primary text-white hover:bg-[#228d83]",
          variant === "outline" &&
            "border border-slate-300 text-slate-900 hover:bg-white",
          variant === "ghost" && "text-slate-600 hover:bg-[#f1f5f3]",
          className,
        )}
        {...props}>
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
export default Button;
