export type DashboardViewName = "dashboard" | "events" | "tickets" | "profile";

export type IconName = "dashboard" | "ticket" | "event" | "profile" | "admin" | "logout";

export type SidebarItem = {
  id: DashboardViewName | "admin" | "logout";
  label: string;
  href: string;
  icon: IconName;
};

export type Event = {
  id: string;
  title: string;
  description: string;
  category: string;
  venue: string;
  location: string;
  startsAt: string;
  imageUrl: string;
  priceCents: number;
  currency: string;
  capacity: number;
  remainingTickets: number;
  featured: boolean;
};

export type TicketStatus = "active" | "used" | "cancelled";

export type Ticket = {
  id: string;
  eventId: string;
  eventTitle: string;
  startsAt: string;
  venue: string;
  location: string;
  imageUrl: string;
  status: TicketStatus;
  quantity: number;
  totalPriceCents: number;
  currency: string;
  bookingReference: string;
  qrData: string;
};

export type UserProfile = {
  displayName: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  role: "customer" | "admin";
};

export type DashboardSnapshot = {
  profile: UserProfile;
  events: Event[];
  tickets: Ticket[];
  updatedAt: string;
};

export type DashboardStat = {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  icon: IconName;
};
