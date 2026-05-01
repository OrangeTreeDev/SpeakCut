import * as React from "react";
import { cn } from "../../lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-full border-0 bg-[#1f1f1f] px-4 py-2 text-sm text-white shadow-[inset_0_0_0_1px_#7c7c7c] outline-none transition placeholder:text-[#b3b3b3] focus-visible:shadow-[inset_0_0_0_1px_#ffffff] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
