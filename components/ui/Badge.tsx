import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted",
  accent: "bg-accent text-on-accent",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & { tone?: Tone };

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        TONES[tone],
        className
      )}
      {...props}
    />
  );
}
