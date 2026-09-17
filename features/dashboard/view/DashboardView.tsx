import { useState } from "react";
import Link from "next/link";
import type {
  DashboardStat,
  DashboardViewName,
  Event,
  SidebarItem,
  Ticket,
  UserProfile,
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
  activeView: DashboardViewName;
  profile: UserProfile;
  events: Event[];
  tickets: Ticket[];
  nextTicket: Ticket | null;
  sidebarItems: SidebarItem[];
  stats: DashboardStat[];
  updatedAt: string;
  isLoading: boolean;
  actionId: string | null;
  error: string | null;
  notice: string | null;
  onBook: (event: Event, quantity?: number) => Promise<void>;
  onProfileSave: (displayName: string, phone: string) => Promise<void>;
  onLogout: () => Promise<void>;
};

function PageHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <header className={styles.pageHeading}><span className={styles.eyebrow}>{eyebrow}</span><h1>{title}</h1><p>{copy}</p></header>;
}

function ProfileForm({ profile, saving, onSave }: { profile: UserProfile; saving: boolean; onSave: DashboardViewProps["onProfileSave"] }) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [phone, setPhone] = useState(profile.phone);

  return (
    <form className={styles.profileCard} onSubmit={(event) => { event.preventDefault(); void onSave(displayName, phone); }}>
      <div className={styles.profileIntro}>
        <span className={styles.largeAvatar}>{displayName.split(" ").filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "ET"}</span>
        <div><h2>Your details</h2><p>Keep your ticket holder information current.</p></div>
      </div>
      <div className={styles.formGrid}>
        <label>Full name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required minLength={2} maxLength={80} /></label>
        <label>Email<input value={profile.email} type="email" disabled /></label>
        <label>Phone number<input value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={30} placeholder="Add a phone number" /></label>
      </div>
      <button className={styles.primaryButton} type="submit" disabled={saving || displayName.trim().length < 2}>{saving ? "Saving…" : "Save changes"}</button>
    </form>
  );
}

export function DashboardView(props: DashboardViewProps) {
  const {
    activeView, profile, events, tickets, nextTicket, sidebarItems, stats, updatedAt,
    isLoading, actionId, error, notice, onBook, onProfileSave, onLogout,
  } = props;

  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        <Sidebar appName="eTicket" items={sidebarItems} activeView={activeView} onLogout={onLogout} />
        <div className={styles.contentArea}>
          <Topbar userName={profile.displayName || "Member"} avatarUrl={profile.avatarUrl} />
          <div className={styles.main}>
            {isLoading ? <div className={styles.loading}><span /><p>Preparing your tickets…</p></div> : null}
            {!isLoading && error ? <p className={styles.errorBanner} role="alert">{error}</p> : null}
            {!isLoading && notice ? <p className={styles.noticeBanner} role="status">{notice}</p> : null}

            {!isLoading && activeView === "dashboard" ? (
              <>
                <WelcomeBanner userName={profile.displayName || "there"} updatedAt={updatedAt} />
                <section className={styles.statsGrid}>{stats.map((stat) => <StatCard key={stat.id} stat={stat} />)}</section>
                {nextTicket ? <NextEventCard ticket={nextTicket} /> : <section className={styles.emptyHero}><span className={styles.eyebrow}>START HERE</span><h2>Your next great night is waiting.</h2><p>Explore curated events and your tickets will appear here.</p><Link href="/events" className={styles.primaryButton}>Discover events</Link></section>}
                <section><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>JUST ANNOUNCED</span><h2>Events worth leaving home for</h2></div><Link href="/events">View all →</Link></div><div className={styles.eventGrid}>{events.slice(0, 3).map((event) => <EventCard key={event.id} event={event} isBooking={actionId === event.id} onBook={onBook} />)}</div></section>
              </>
            ) : null}

            {!isLoading && activeView === "events" ? (
              <><PageHeading eyebrow="DISCOVER" title="Find your next story." copy="Concerts, conversations, and unforgettable tables—booked in a few taps." /><div className={styles.eventGrid}>{events.map((event) => <EventCard key={event.id} event={event} isBooking={actionId === event.id} onBook={onBook} />)}</div></>
            ) : null}

            {!isLoading && activeView === "tickets" ? (
              <><PageHeading eyebrow="YOUR PASSES" title="Tickets, ready when you are." copy="Everything you need for entry, together in one place." />{tickets.length ? <div className={styles.ticketGrid}>{tickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}</div> : <div className={styles.emptyState}><h2>No tickets yet</h2><p>When you book an event, your mobile ticket will live here.</p><Link href="/events" className={styles.primaryButton}>Browse events</Link></div>}</>
            ) : null}

            {!isLoading && activeView === "profile" ? (
              <><PageHeading eyebrow="ACCOUNT" title="Make it yours." copy="Manage the details attached to your bookings." /><ProfileForm key={`${profile.email}-${profile.displayName}-${profile.phone}`} profile={profile} saving={actionId === "profile"} onSave={onProfileSave} /></>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
