"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import type { PublicCategory } from "@/features/events/model/events.types";
import { REGION_FILTERS } from "@/lib/regions";

export const DATE_PRESETS = [
  { id: "", label: "Any date" },
  { id: "today", label: "Today" },
  { id: "weekend", label: "This weekend" },
  { id: "week", label: "Next 7 days" },
  { id: "month", label: "This month" },
] as const;

// Date ranges are worked out in the visitor's own time zone.
function presetRange(preset: string): { from: string; to: string } {
  const now = new Date();
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const endOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

  switch (preset) {
    case "today":
      return { from: now.toISOString(), to: endOfDay(now).toISOString() };
    case "weekend": {
      const day = now.getDay(); // 0 = Sunday … 6 = Saturday
      if (day === 0) return { from: now.toISOString(), to: endOfDay(now).toISOString() };
      const saturday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - day));
      const sunday = new Date(saturday.getFullYear(), saturday.getMonth(), saturday.getDate() + 1);
      const from = day === 6 ? now : startOfDay(saturday);
      return { from: from.toISOString(), to: endOfDay(sunday).toISOString() };
    }
    case "week": {
      const end = new Date(now);
      end.setDate(now.getDate() + 7);
      return { from: now.toISOString(), to: endOfDay(end).toISOString() };
    }
    case "month":
      return { from: now.toISOString(), to: endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)).toISOString() };
    default:
      return { from: "", to: "" };
  }
}

type EventFiltersProps = {
  categories: PublicCategory[];
  initial: { q: string; category: string; region: string; when: string };
};

export function EventFilters({ categories, initial }: EventFiltersProps) {
  const router = useRouter();
  const [q, setQ] = useState(initial.q);
  const [category, setCategory] = useState(initial.category);
  const [region, setRegion] = useState(initial.region);
  const [when, setWhen] = useState(initial.when);

  const apply = (next: { q: string; category: string; region: string; when: string }) => {
    const params = new URLSearchParams();
    if (next.q.trim()) params.set("q", next.q.trim());
    if (next.category) params.set("category", next.category);
    if (next.region) params.set("region", next.region);
    if (next.when) {
      const range = presetRange(next.when);
      params.set("when", next.when);
      if (range.from) params.set("from", range.from);
      if (range.to) params.set("to", range.to);
    }
    const query = params.toString();
    router.push(query ? `/events?${query}` : "/events");
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    apply({ q, category, region, when });
  };

  const hasFilters = initial.q || initial.category || initial.region || initial.when;

  return (
    <form
      role="search"
      onSubmit={onSubmit}
      className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2 sm:items-end lg:grid-cols-[2fr_1fr_1fr_1fr_auto]"
    >
      <Field label="Search">
        {(props) => (
          <Input
            {...props}
            type="search"
            name="q"
            placeholder="Event or venue"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
        )}
      </Field>
      <Field label="Category">
        {(props) => (
          <Select
            {...props}
            name="category"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              apply({ q, category: event.target.value, region, when });
            }}
          >
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item.id} value={item.slug}>
                {item.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Region">
        {(props) => (
          <Select
            {...props}
            name="region"
            value={region}
            onChange={(event) => {
              setRegion(event.target.value);
              apply({ q, category, region: event.target.value, when });
            }}
          >
            {REGION_FILTERS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Date">
        {(props) => (
          <Select
            {...props}
            name="when"
            value={when}
            onChange={(event) => {
              setWhen(event.target.value);
              apply({ q, category, region, when: event.target.value });
            }}
          >
            {DATE_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <div className="flex gap-2">
        <Button type="submit">Search</Button>
        {hasFilters ? (
          <Button
            variant="ghost"
            onClick={() => {
              setQ("");
              setCategory("");
              setRegion("");
              setWhen("");
              router.push("/events");
            }}
          >
            Clear
          </Button>
        ) : null}
      </div>
    </form>
  );
}
