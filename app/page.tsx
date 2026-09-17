"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { fetchPublicEvents } from "@/features/dashboard/model/dashboard.repository";
import type { Event } from "@/features/dashboard/model/dashboard.types";
import { formatMoney } from "@/features/dashboard/model/formatters";
import styles from "./Home.module.css";

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const visibleEvents: Array<Event | null> = events.length
    ? events.slice(0, 3)
    : [null, null, null];

  useEffect(() => {
    void fetchPublicEvents().then(setEvents).catch(() => setEvents([]));
  }, []);

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
        <div className={styles.sectionHead}><div><span className={styles.eyebrow}>PACIFIC & WORLD EVENTS</span><h2>Start local. Go anywhere.</h2></div><Link href="/signup">See all events →</Link></div>
        <div className={styles.eventGrid}>
          {visibleEvents.map((item, index) => item ? (
            <article key={item.id} className={styles.eventCard}><div className={styles.imageWrap}><Image src={item.imageUrl} alt="" fill sizes="(max-width: 820px) 92vw, 33vw" /><span>{item.category}</span></div><p>{new Date(item.startsAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p><h3>{item.title}</h3><small>{item.venue} · {item.location}</small><footer><strong>{formatMoney(item.priceCents, item.currency)}</strong><Link href="/login">Book now</Link></footer></article>
          ) : <div key={index} className={styles.skeleton} />)}
        </div>
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
