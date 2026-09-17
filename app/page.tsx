"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { fetchPublicEvents } from "@/features/dashboard/model/dashboard.repository";
import type { Event } from "@/features/dashboard/model/dashboard.types";
import styles from "./Home.module.css";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

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
          <span className={styles.eyebrow}>CURATED LIVE EXPERIENCES</span>
          <h1>Go where the<br/><em>good stories</em> are.</h1>
          <p>Discover remarkable events, secure your spot in seconds, and keep every ticket exactly where you need it.</p>
          <div className={styles.heroActions}><a href="#events" className={styles.primary}>Explore events</a><Link href="/signup" className={styles.secondary}>Create an account →</Link></div>
          <div className={styles.trust}><strong>10k+</strong><span>happy eventgoers</span><i /><strong>4.9</strong><span>average rating</span></div>
        </div>
        <div className={styles.heroVisual}>
          <Image src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=90" alt="Crowd enjoying a live festival" fill sizes="(max-width: 820px) 92vw, 52vw" priority />
          <div className={styles.dateBadge}><span>OCT</span><strong>03</strong></div>
          <div className={styles.floatingTicket}><span>FEATURED EVENT</span><strong>Neon Harbor Festival</strong><small>Brooklyn · 7:30 PM</small></div>
        </div>
      </section>

      <section className={styles.events} id="events">
        <div className={styles.sectionHead}><div><span className={styles.eyebrow}>JUST ANNOUNCED</span><h2>A reason to go out.</h2></div><Link href="/signup">See all events →</Link></div>
        <div className={styles.eventGrid}>
          {visibleEvents.map((item, index) => item ? (
            <article key={item.id} className={styles.eventCard}><div className={styles.imageWrap}><Image src={item.imageUrl} alt="" fill sizes="(max-width: 820px) 92vw, 33vw" /><span>{item.category}</span></div><p>{new Date(item.startsAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p><h3>{item.title}</h3><small>{item.venue} · {item.location}</small><footer><strong>{money.format(item.priceCents / 100)}</strong><Link href="/login">Book now</Link></footer></article>
          ) : <div key={index} className={styles.skeleton} />)}
        </div>
      </section>

      <section className={styles.how} id="how">
        <div><span className={styles.eyebrow}>EFFORTLESS BY DESIGN</span><h2>From “what’s on?”<br/>to “we’re in.”</h2></div>
        <ol><li><span>01</span><div><h3>Find your thing</h3><p>Browse a thoughtful edit of concerts, talks, food, and culture.</p></div></li><li><span>02</span><div><h3>Book in a beat</h3><p>Choose your event and receive your secure digital ticket instantly.</p></div></li><li><span>03</span><div><h3>Just show up</h3><p>Open your phone, scan your ticket, and get to the good part.</p></div></li></ol>
      </section>

      <section className={styles.cta}><span className={styles.eyebrow}>YOUR NEXT MEMORY STARTS HERE</span><h2>Make plans worth<br/>looking forward to.</h2><Link href="/signup" className={styles.primary}>Find an event</Link></section>
      <footer className={styles.footer}><Link href="/" className={styles.logo}>eTicket<span>.</span></Link><p>Real moments. One simple ticket.</p><small>© 2026 eTicket</small></footer>
    </main>
  );
}
