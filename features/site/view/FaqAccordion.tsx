import type { ReactNode } from "react";

export type FaqItem = { question: string; answer: ReactNode };

// Questions that open in place. Native <details>, so it works without
// JavaScript and with the keyboard and screen readers out of the box.
export function FaqAccordion({ items }: { items: FaqItem[] }) {
  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <details key={item.question} className="group rounded-lg border border-border bg-surface open:border-accent/50">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg px-4 py-3.5 font-semibold text-fg focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
            {item.question}
            <span aria-hidden className="shrink-0 text-muted transition-transform group-open:rotate-180">
              ▾
            </span>
          </summary>
          <div className="grid gap-3 px-4 pb-4 text-sm">{item.answer}</div>
        </details>
      ))}
    </div>
  );
}
