import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

// Compact data table; scrolls horizontally on small screens.
export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className={cn("w-full border-collapse text-left text-sm", className)} {...props} />
    </div>
  );
}

export function THead(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="bg-surface-2 text-xs uppercase tracking-wide text-muted" {...props} />;
}

export function TBody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className="divide-y divide-border" {...props} />;
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th scope="col" className={cn("px-3 py-2.5 font-semibold whitespace-nowrap", className)} {...props} />;
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-3 py-2.5 align-middle", className)} {...props} />;
}
