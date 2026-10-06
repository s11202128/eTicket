import type { EventSummary } from "@/features/events/model/events.types";
import type { IconName } from "@/features/shell/model/navigation";
import type { TicketSummary } from "@/features/tickets/model/tickets.types";

export type DashboardStat = {
  id: string;
  title: string;
  value: number;
  subtitle: string;
  icon: IconName;
};

export type NextEvent = {
  id: string;
  title: string;
  dateTime: string;
  location: string;
  imageUrl: string;
  ctaLabel: string;
};

export type DashboardData = {
  stats: DashboardStat[];
  nextEvent: NextEvent | null;
  recentTickets: TicketSummary[];
  upcomingEvents: EventSummary[];
};

export type DashboardSnapshot = DashboardData & {
  updatedAt: string;
};
