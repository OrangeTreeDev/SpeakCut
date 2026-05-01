import * as React from "react";
import { cn } from "../../lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "min-h-24 w-full rounded-lg border-0 bg-[#1f1f1f] px-4 py-3 text-sm text-white shadow-[inset_0_0_0_1px_#7c7c7c] outline-none transition placeholder:text-[#b3b3b3] focus-visible:shadow-[inset_0_0_0_1px_#ffffff] disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";
