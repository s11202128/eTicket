"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { fetchPublicEvents } from "@/features/dashboard/model/dashboard.repository";
import type { Event } from "@/features/dashboard/model/dashboard.types";
import {
  matchesEventHorizon,
  type EventHorizon,
} from "@/features/dashboard/model/event-discovery";
import { formatMoney } from "@/features/dashboard/model/formatters";
import styles from "./Home.module.css";

type PublicEventFilters = {
  eventName: string;
  eventType: string;
  location: string;
  horizon: EventHorizon;
};

const EMPTY_FILTERS: PublicEventFilters = {
  eventName: "",
  eventType: "all",
  location: "all",
  horizon: "all",
};

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [eventName, setEventName] = useState("");
  const [eventType, setEventType] = useState("all");
  const [location, setLocation] = useState("all");
  const [filters, setFilters] = useState<PublicEventFilters>(EMPTY_FILTERS);
  const categories = [...new Set(events.map((event) => event.category))].sort();
  const locations = [...new Set(events.map((event) => event.location))].sort();
  const horizonOptions: Array<{ id: EventHorizon; label: string }> = [
    { id: "all", label: "All signals" },
    { id: "solomon", label: "Solomon Islands" },
    { id: "pacific", label: "Pacific orbit" },
    { id: "world", label: "Global pulse" },
  ];
  const filteredEvents = events.filter((event) => {
    const term = filters.eventName.toLowerCase();
    const searchableEvent = `${event.title} ${event.description} ${event.category} ${event.venue} ${event.location}`.toLowerCase();
    return (!term || searchableEvent.includes(term))
      && (filters.eventType === "all" || event.category === filters.eventType)
      && (filters.location === "all" || event.location === filters.location)
      && matchesEventHorizon(event, filters.horizon);
  });
  const visibleEvents: Array<Event | null> = isLoading
    ? [null, null, null, null]
    : filteredEvents;
  const hasFilters = filters.eventName || filters.eventType !== "all" || filters.location !== "all" || filters.horizon !== "all";

  useEffect(() => {
    void fetchPublicEvents()
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setIsLoading(false));
  }, []);

  const clearFilters = () => {
    setEventName("");
    setEventType("all");
    setLocation("all");
    setFilters(EMPTY_FILTERS);
  };

  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.logo}>eTicket<span>.</span></Link>
        <div className={styles.links}><a href="#events">Events</a><a href="#how">How it works</a></div>
        <div className={styles.actions}><Link href="/login">Sign in</Link><Link href="/signup" className={styles.navCta}>Join free</Link></div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>BORN IN SOLOMON ISLANDS</span>
          <h1>The Pacific is<br/><em>your starting point.</em></h1>
          <p>Discover remarkable events in Solomon Islands, across our Pacific region, and around the world—all in one trusted place.</p>
          <div className={styles.heroActions}><a href="#events" className={styles.primary}>Explore events</a><Link href="/signup" className={styles.secondary}>Create an account →</Link></div>
          <div className={styles.trust}><strong>SBD</strong><span>local payments</span><i /><strong>Global</strong><span>event discovery</span></div>
        </div>
        <div className={styles.heroVisual}>
          <Image src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=90" alt="Crowd enjoying a live festival" fill sizes="(max-width: 820px) 92vw, 52vw" priority />
          <div className={styles.dateBadge}><span>OCT</span><strong>03</strong></div>
          <div className={styles.floatingTicket}><span>FEATURED IN SOLOMON ISLANDS</span><strong>Music & Arts Festival</strong><small>Honiara · 7:30 PM</small></div>
        </div>
      </section>

      <section className={styles.events} id="events">
        <div className={styles.signalPanel}>
          <div className={styles.signalHeader}>
            <div><span className={styles.signalEyebrow}><i /> LIVE DISCOVERY</span><h2>Tune into what&apos;s next.</h2><p>Search the islands, follow the Pacific, or lock onto a global experience.</p></div>
            <div className={styles.signalReadout} aria-live="polite"><span>{isLoading ? "—" : filteredEvents.length.toString().padStart(2, "0")}</span><small>EVENT SIGNALS</small></div>
          </div>

          <div className={styles.horizonRail} role="group" aria-label="Browse events by region">
            {horizonOptions.map((option) => (
              <button
                key={option.id}
                className={filters.horizon === option.id ? styles.horizonActive : ""}
                type="button"
                aria-pressed={filters.horizon === option.id}
                onClick={() => setFilters((current) => ({ ...current, horizon: option.id }))}
              >
                <span />{option.label}
              </button>
            ))}
          </div>

          <form
            className={styles.publicFinder}
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              setFilters((current) => ({ ...current, eventName: eventName.trim(), eventType, location }));
            }}
          >
            <label><span>01 / PLACE</span><select value={location} onChange={(event) => setLocation(event.target.value)}><option value="all">Anywhere</option>{locations.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label><span>02 / EXPERIENCE</span><select value={eventType} onChange={(event) => setEventType(event.target.value)}><option value="all">Every event type</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label className={styles.nameField}><span>03 / SEARCH SIGNAL</span><input type="search" value={eventName} onChange={(event) => setEventName(event.target.value)} placeholder="Event, artist, or venue…" /></label>
            <button type="submit"><span>Search events</span><b aria-hidden="true">↗</b></button>
          </form>
        </div>

        <div className={styles.sectionHead}>
          <div><span className={styles.eyebrow}>UPCOMING EVENT SIGNALS</span><h2>{hasFilters ? "Your matched experiences." : "Start local. Go anywhere."}</h2></div>
          <div className={styles.resultMeta}><span>{isLoading ? "Finding events…" : `${filteredEvents.length} ${filteredEvents.length === 1 ? "event" : "events"}`}</span>{hasFilters ? <button type="button" onClick={clearFilters}>Clear search</button> : <Link href="/signup">Join to book →</Link>}</div>
        </div>
        <div className={styles.eventGrid}>
          {visibleEvents.map((item, index) => item ? (
            <article key={item.id} className={styles.eventCard}>
              <div className={styles.imageWrap}>
                <Image src={item.imageUrl} alt={`${item.title} event`} fill sizes="(max-width: 820px) 92vw, (max-width: 1180px) 46vw, 25vw" />
                <div className={styles.cardBadges}><span>{item.category}</span>{item.featured ? <span>Featured</span> : null}</div>
                <div className={styles.dateTile}><span>{new Date(item.startsAt).toLocaleDateString(undefined, { month: "short" })}</span><strong>{new Date(item.startsAt).getDate()}</strong></div>
              </div>
              <div className={styles.eventCardBody}>
                <p><i /> {item.location}</p>
                <h3>{item.title}</h3>
                <small>{item.venue}</small>
                <footer><div><span>FROM</span><strong>{formatMoney(item.priceCents, item.currency)}</strong></div><Link href="/login" aria-label={`View and book ${item.title}`}>View &amp; book <b aria-hidden="true">↗</b></Link></footer>
              </div>
            </article>
          ) : <div key={index} className={styles.skeleton} />)}
        </div>
        {!isLoading && !filteredEvents.length ? <div className={styles.noSignal}><span aria-hidden="true">◎</span><h3>No event signal found</h3><p>Try another place, experience, or event name.</p><button type="button" onClick={clearFilters}>Reset discovery</button></div> : null}
      </section>

      <section className={styles.how} id="how">
        <div><span className={styles.eyebrow}>ONE PLATFORM, EVERYWHERE</span><h2>From Honiara<br/>to the world.</h2></div>
        <ol><li><span>01</span><div><h3>Discover near and far</h3><p>Browse events in Solomon Islands, across the Pacific, and internationally.</p></div></li><li><span>02</span><div><h3>Pay in the event currency</h3><p>See transparent prices in SBD, regional currencies, or the organiser&apos;s currency.</p></div></li><li><span>03</span><div><h3>Carry one digital ticket</h3><p>Open your phone, scan your ticket, and enjoy the experience wherever it takes you.</p></div></li></ol>
      </section>

      <section className={styles.cta}><span className={styles.eyebrow}>YOUR NEXT MEMORY STARTS HERE</span><h2>Solomon Islands roots.<br/>A world of experiences.</h2><Link href="/signup" className={styles.primary}>Find an event</Link></section>
      <footer className={styles.footer}><Link href="/" className={styles.logo}>eTicket<span>.</span></Link><p>Born in Solomon Islands. Built for the world.</p><small>© 2026 eTicket</small></footer>
    </main>
  );
}
