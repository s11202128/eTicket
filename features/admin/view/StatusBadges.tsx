import { Badge } from "@/components/ui/Badge";
import type { EventStatus, TicketDbStatus, UserRole } from "@/lib/database.types";

const EVENT_TONES = { draft: "neutral", published: "success", cancelled: "danger" } as const;
const TICKET_TONES = { active: "success", used: "neutral", cancelled: "danger" } as const;
const ROLE_TONES = { user: "neutral", staff: "warning", admin: "accent" } as const;

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return <Badge tone={EVENT_TONES[status]} className="capitalize">{status}</Badge>;
}

export function TicketStatusBadge({ status }: { status: TicketDbStatus }) {
  return <Badge tone={TICKET_TONES[status]} className="capitalize">{status}</Badge>;
}

export function RoleBadge({ role }: { role: UserRole }) {
  return <Badge tone={ROLE_TONES[role]} className="capitalize">{role}</Badge>;
}

// "12 / 100" with a small bar; "12 sold" when unlimited.
export function CapacityMeter({ sold, capacity }: { sold: number; capacity: number | null }) {
  if (capacity === null) {
    return <span className="tabular-nums">{sold} sold</span>;
  }
  const ratio = Math.min(sold / capacity, 1);
  const tone = ratio >= 1 ? "bg-danger" : ratio >= 0.8 ? "bg-warning" : "bg-success";
  return (
    <div className="grid min-w-24 gap-1">
      <span className="tabular-nums text-xs">
        {sold} / {capacity}
      </span>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-surface-2"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-valuenow={sold}
        aria-label="Tickets sold"
      >
        <div className={`h-full ${tone}`} style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}
