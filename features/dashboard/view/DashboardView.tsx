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
import {
  matchesEventHorizon,
  type EventHorizon,
} from "@/features/dashboard/model/event-discovery";
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

type EventDateWindow = "all" | "30" | "90";
type EventSort = "soonest" | "name" | "availability";

type EventFilters = {
  eventName: string;
  eventType: string;
  location: string;
  horizon: EventHorizon;
};

const EMPTY_EVENT_FILTERS: EventFilters = {
  eventName: "",
  eventType: "all",
  location: "all",
  horizon: "all",
};

function isWithinDays(startsAt: string, days: number) {
  const now = new Date();
  const eventDate = new Date(startsAt);
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + days);
  return eventDate >= now && eventDate <= cutoff;
}

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

function EventExplorer({ events, actionId, onBook }: Pick<DashboardViewProps, "events" | "actionId" | "onBook">) {
  const [eventName, setEventName] = useState("");
  const [eventType, setEventType] = useState("all");
  const [location, setLocation] = useState("all");
  const [filters, setFilters] = useState<EventFilters>(EMPTY_EVENT_FILTERS);
  const [dateWindow, setDateWindow] = useState<EventDateWindow>("all");
  const [sortOrder, setSortOrder] = useState<EventSort>("soonest");
  const categories = [...new Set(events.map((event) => event.category))].sort();
  const locations = [...new Set(events.map((event) => event.location))].sort();
  const horizonOptions: Array<{ id: EventHorizon; label: string; detail: string }> = [
    { id: "all", label: "Everywhere", detail: "All horizons" },
    { id: "solomon", label: "Solomon Islands", detail: "Close to home" },
    { id: "pacific", label: "Pacific region", detail: "Across our ocean" },
    { id: "world", label: "Beyond Pacific", detail: "Further afield" },
  ];
  const horizonCounts = Object.fromEntries(
    horizonOptions.map((option) => [option.id, events.filter((event) => matchesEventHorizon(event, option.id)).length]),
  ) as Record<EventHorizon, number>;
  const filteredEvents = events.filter((event) => {
    const term = filters.eventName.toLowerCase();
    const searchableEvent = `${event.title} ${event.description} ${event.category} ${event.venue} ${event.location}`.toLowerCase();
    const matchesName = !term || searchableEvent.includes(term);
    const matchesType = filters.eventType === "all" || event.category === filters.eventType;
    const matchesLocation = filters.location === "all" || event.location === filters.location;
    const matchesDate = dateWindow === "all" || isWithinDays(event.startsAt, Number(dateWindow));
    return matchesName && matchesType && matchesLocation && matchesEventHorizon(event, filters.horizon) && matchesDate;
  }).sort((left, right) => {
    if (sortOrder === "name") return left.title.localeCompare(right.title);
    if (sortOrder === "availability") return right.remainingTickets - left.remainingTickets;
    return new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime();
  });
  const hasFilters = filters.eventName || filters.eventType !== "all" || filters.location !== "all" || filters.horizon !== "all" || dateWindow !== "all";

  const clearFilters = () => {
    setEventName("");
    setEventType("all");
    setLocation("all");
    setFilters(EMPTY_EVENT_FILTERS);
    setDateWindow("all");
    setSortOrder("soonest");
  };

  return (
    <>
      <section className={styles.discoveryDeck} aria-labelledby="island-compass-heading">
        <div className={styles.discoveryIntro}>
          <div>
            <span className={styles.discoveryEyebrow}>ISLAND COMPASS</span>
            <h2 id="island-compass-heading">Where will your next story take you?</h2>
            <p>Begin in Honiara, follow the Pacific, or discover something further away.</p>
          </div>
          <div className={styles.compassMark} aria-hidden="true"><span>N</span><i /><b /></div>
        </div>

        <div className={styles.horizonPicker} role="group" aria-label="Browse events by region">
          {horizonOptions.map((option) => (
            <button
              key={option.id}
              className={filters.horizon === option.id ? styles.horizonActive : ""}
              type="button"
              aria-pressed={filters.horizon === option.id}
              onClick={() => setFilters((current) => ({ ...current, horizon: option.id }))}
            >
              <span>{option.label}</span>
              <small>{option.detail}</small>
              <strong>{horizonCounts[option.id]}</strong>
            </button>
          ))}
        </div>

        <form
          className={styles.eventFinder}
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            setFilters((current) => ({ ...current, eventName: eventName.trim(), eventType, location }));
          }}
        >
          <label className={styles.filterLabel}>Country / location
            <select value={location} onChange={(event) => setLocation(event.target.value)}>
              <option value="all">Anywhere</option>
              {locations.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className={styles.filterLabel}>Event type
            <select value={eventType} onChange={(event) => setEventType(event.target.value)}>
              <option value="all">All experiences</option>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className={styles.filterLabel}>Event name
            <input value={eventName} onChange={(event) => setEventName(event.target.value)} placeholder="Artist, venue, or event…" type="search" />
          </label>
          <button className={styles.filterButton} type="submit"><span aria-hidden="true">↗</span> Find my event</button>
        </form>
      </section>

      <div className={styles.resultToolbar}>
        <div className={styles.resultSummary} aria-live="polite">
          <span>{filteredEvents.length}</span>
          <div><strong>{filteredEvents.length === 1 ? "event found" : "events found"}</strong><small>{hasFilters ? "Matched to your compass" : "Ready to explore"}</small></div>
        </div>
        <div className={styles.resultControls}>
          <label>When
            <select value={dateWindow} onChange={(event) => setDateWindow(event.target.value as EventDateWindow)}>
              <option value="all">Any date</option>
              <option value="30">Next 30 days</option>
              <option value="90">Next 90 days</option>
            </select>
          </label>
          <label>Order
            <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as EventSort)}>
              <option value="soonest">Soonest first</option>
              <option value="name">Event name A–Z</option>
              <option value="availability">Most availability</option>
            </select>
          </label>
          {hasFilters ? <button type="button" onClick={clearFilters}>Reset compass</button> : null}
        </div>
      </div>
      {filteredEvents.length ? (
        <div className={styles.eventGrid}>{filteredEvents.map((event) => <EventCard key={event.id} event={event} isBooking={actionId === event.id} onBook={onBook} />)}</div>
      ) : (
        <div className={styles.emptyState}><span className={styles.emptyCompass} aria-hidden="true">◎</span><h2>No events on this route yet</h2><p>Turn the compass toward another place, date, or kind of experience.</p><button className={styles.primaryButton} type="button" onClick={clearFilters}>Explore every event</button></div>
      )}
    </>
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
                {nextTicket ? <NextEventCard ticket={nextTicket} /> : <section className={styles.emptyHero}><span className={styles.eyebrow}>START HERE</span><h2>Your next great experience is waiting.</h2><p>Explore events from Solomon Islands, across the Pacific, and around the world.</p><Link href="/events" className={styles.primaryButton}>Discover events</Link></section>}
                <section><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>PACIFIC & BEYOND</span><h2>Events worth travelling for</h2></div><Link href="/events">View all →</Link></div><div className={styles.eventGrid}>{events.slice(0, 3).map((event) => <EventCard key={event.id} event={event} isBooking={actionId === event.id} onBook={onBook} />)}</div></section>
              </>
            ) : null}

            {!isLoading && activeView === "events" ? (
              <><PageHeading eyebrow="FROM HONIARA TO THE WORLD" title="Find your next story." copy="Discover local celebrations, Pacific experiences, and standout events from around the globe." /><EventExplorer events={events} actionId={actionId} onBook={onBook} /></>
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
