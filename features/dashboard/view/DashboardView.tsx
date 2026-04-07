import type {
  DashboardStat,
  NextEvent,
  RecentTicket,
  SidebarItem,
  UpcomingEvent,
} from "@/features/dashboard/model/dashboard.types";
import { Sidebar } from "@/features/dashboard/view/components/layout/Sidebar";
import { Topbar } from "@/features/dashboard/view/components/layout/Topbar";
import { WelcomeBanner } from "@/features/dashboard/view/components/dashboard/WelcomeBanner";
import { StatCard } from "@/features/dashboard/view/components/dashboard/StatCard";
import { NextEventCard } from "@/features/dashboard/view/components/dashboard/NextEventCard";
import { TicketCard } from "@/features/dashboard/view/components/tickets/TicketCard";
import { EventCard } from "@/features/dashboard/view/components/events/EventCard";
import styles from "@/features/dashboard/view/DashboardView.module.css";

type DashboardViewProps = {
  appName: string;
  userName: string;
  userAvatar: string;
  notifications: number;
  sidebarItems: SidebarItem[];
  lastUpdated: string;
  stats: DashboardStat[];
  nextEvent: NextEvent | null;
  recentTickets: RecentTicket[];
  upcomingEvents: UpcomingEvent[];
  isLoading: boolean;
  error: string | null;
};

export function DashboardView({
  appName,
  userName,
  userAvatar,
  notifications,
  sidebarItems,
  lastUpdated,
  stats,
  nextEvent,
  recentTickets,
  upcomingEvents,
  isLoading,
  error,
}: DashboardViewProps) {
  if (isLoading) {
    return (
      <main className={styles.page}>
        <p className={styles.stateText}>Loading dashboard...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.page}>
        <p className={styles.stateText}>{error}</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        <Sidebar appName={appName} items={sidebarItems} />

        <div className={styles.contentArea}>
          <Topbar notifications={notifications} avatarUrl={userAvatar} />

          <div className={styles.main}>
            <WelcomeBanner userName={userName} updatedAt={lastUpdated} />

            <section className={styles.statsGrid}>
              {stats.map((stat) => (
                <StatCard key={stat.id} stat={stat} />
              ))}
            </section>

            {nextEvent ? <NextEventCard event={nextEvent} /> : null}

            <section>
              <h2 className={styles.sectionTitle}>Recent Tickets</h2>
              <div className={styles.ticketGrid}>
                {recentTickets.map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </div>
            </section>

            <section>
              <h2 className={styles.sectionTitle}>Upcoming Events</h2>
              <div className={styles.eventGrid}>
                {upcomingEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
