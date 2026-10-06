"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

type Tab<T extends string> = { id: T; label: string; count?: number };

type TabsProps<T extends string> = {
  tabs: Tab<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  idPrefix: string;
};

// WAI-ARIA tabs: arrow keys move between tabs. Pair each panel with
// id={`${idPrefix}-panel-${tab}`} and aria-labelledby={`${idPrefix}-tab-${tab}`}.
export function Tabs<T extends string>({ tabs, value, onChange, label, idPrefix }: TabsProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const last = tabs.length - 1;
    const next =
      event.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : event.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null;
    if (next === null) return;
    event.preventDefault();
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label={label} className="flex gap-1 border-b border-border">
      {tabs.map((tab, index) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(element) => {
              refs.current[index] = element;
            }}
            id={`${idPrefix}-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
              selected ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"
            )}
          >
            {tab.label}
            {tab.count !== undefined ? <span className="ml-1.5 text-xs text-muted">({tab.count})</span> : null}
          </button>
        );
      })}
    </div>
  );
}
