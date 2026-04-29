import * as React from "react";
import { cn } from "../../lib/utils";

interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function Slider({ className, ...props }: SliderProps) {
  return (
    <input
      type="range"
      className={cn("h-2 w-full cursor-pointer accent-[var(--color-primary)] disabled:cursor-not-allowed", className)}
      {...props}
    />
  );
}
