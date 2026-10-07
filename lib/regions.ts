import type { EventRegion } from "@/lib/database.types";

// Where an event takes place, as chosen by admins in the event form.
export const REGIONS: { id: EventRegion; label: string }[] = [
  { id: "solomon_islands", label: "Solomon Islands" },
  { id: "pacific", label: "Pacific Islands" },
  { id: "international", label: "International" },
];

export const REGION_LABELS: Record<EventRegion, string> = {
  solomon_islands: "Solomon Islands",
  pacific: "Pacific Islands",
  international: "International",
};

// Options for the public /events filter. "Across the Pacific" includes the
// Solomon Islands, matching how visitors think about the region.
export const REGION_FILTERS = [
  { id: "", label: "All regions", regions: null },
  { id: "solomon-islands", label: "Solomon Islands", regions: ["solomon_islands"] },
  { id: "pacific", label: "Across the Pacific", regions: ["solomon_islands", "pacific"] },
  { id: "international", label: "International", regions: ["international"] },
] as const satisfies readonly { id: string; label: string; regions: readonly EventRegion[] | null }[];

export type RegionFilterId = (typeof REGION_FILTERS)[number]["id"];

export function regionsForFilter(id: string): readonly EventRegion[] | null {
  return REGION_FILTERS.find((filter) => filter.id === id)?.regions ?? null;
}

export function isEventRegion(value: string): value is EventRegion {
  return REGIONS.some((region) => region.id === value);
}
