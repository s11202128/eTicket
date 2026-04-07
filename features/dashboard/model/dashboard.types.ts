export type IconName =
  | "dashboard"
  | "ticket"
  | "event"
  | "profile"
  | "logout"
  | "calendar"
  | "clock";

export type SidebarItem = {
  id: string;
  label: string;
  href: string;
  icon: IconName;
  active?: boolean;
};

export type DashboardStat = {
  id: string;
  title: string;
  value: number;
  subtitle: string;
  icon: IconName;
};

export type NextEvent = {
  title: string;
  dateTime: string;
  location: string;
  imageUrl: string;
  ctaLabel: string;
};

export type TicketStatus = "Active" | "Used";

export type RecentTicket = {
  id: string;
  eventTitle: string;
  date: string;
  location: string;
  status: TicketStatus;
  qrImageUrl: string;
};

export type UpcomingEvent = {
  id: string;
  title: string;
  date: string;
  price: string;
  imageUrl: string;
};

export type DashboardData = {
  appName: string;
  userName: string;
  userAvatar: string;
  notifications: number;
  sidebarItems: SidebarItem[];
  stats: DashboardStat[];
  nextEvent: NextEvent;
  recentTickets: RecentTicket[];
  upcomingEvents: UpcomingEvent[];
};

export type DashboardSnapshot = DashboardData & {
  updatedAt: string;
};
