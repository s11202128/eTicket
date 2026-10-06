import type { Event } from "@/features/dashboard/model/dashboard.types";

export type EventHorizon = "all" | "solomon" | "pacific" | "world";

const PACIFIC_LOCATION_MARKERS = [
  "solomon islands",
  "fiji",
  "new zealand",
  "papua new guinea",
  "vanuatu",
  "samoa",
  "tonga",
  "kiribati",
  "tuvalu",
  "nauru",
  "palau",
  "micronesia",
  "marshall islands",
  "cook islands",
  "niue",
  "new caledonia",
];

export function matchesEventHorizon(event: Event, horizon: EventHorizon) {
  const location = event.location.toLowerCase();
  const isSolomon = location.includes("solomon islands");
  const isPacific = PACIFIC_LOCATION_MARKERS.some((marker) => location.includes(marker));

  if (horizon === "solomon") return isSolomon;
  if (horizon === "pacific") return isPacific;
  if (horizon === "world") return !isPacific;
  return true;
}
