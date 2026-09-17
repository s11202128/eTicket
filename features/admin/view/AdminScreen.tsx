"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createManagedEvent,
  deleteManagedEvent,
  fetchAdminSnapshot,
  updateManagedEvent,
} from "@/features/admin/model/admin.repository";
import type {
  AdminEventInput,
  AdminOverview,
  ManagedEvent,
} from "@/features/admin/model/admin.types";
import { hasActiveSession, signOut } from "@/features/auth/model/session.repository";
import { formatMoney } from "@/features/dashboard/model/formatters";
import styles from "./AdminView.module.css";

type StatusFilter = "all" | "live" | "draft";

const EMPTY_OVERVIEW: AdminOverview = {
  totalEvents: 0,
  liveEvents: 0,
  draftEvents: 0,
  ticketsIssued: 0,
  totalCapacity: 0,
  occupancyRate: 0,
};

const EMPTY_INPUT: AdminEventInput = {
  title: "",
  description: "",
  category: "Festival",
  venue: "",
  location: "Honiara, Solomon Islands",
  startsAt: "",
  imageUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=85",
  priceCents: 0,
  currency: "SBD",
  capacity: 100,
  featured: false,
  published: false,
};

function toLocalDateTime(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formInput(event?: ManagedEvent): AdminEventInput {
  if (!event) return { ...EMPTY_INPUT };
  return {
    title: event.title,
    description: event.description,
    category: event.category,
    venue: event.venue,
    location: event.location,
    startsAt: toLocalDateTime(event.startsAt),
    imageUrl: event.imageUrl,
    priceCents: event.priceCents,
    currency: event.currency,
    capacity: event.capacity,
    featured: event.featured,
    published: event.published,
  };
}

function recalculate(events: ManagedEvent[]): AdminOverview {
  const totalCapacity = events.reduce((sum, event) => sum + event.capacity, 0);
  const ticketsIssued = events.reduce((sum, event) => sum + event.ticketsSold, 0);
  return {
    totalEvents: events.length,
    liveEvents: events.filter((event) => event.published).length,
    draftEvents: events.filter((event) => !event.published).length,
    ticketsIssued,
    totalCapacity,
    occupancyRate: totalCapacity ? Math.round((ticketsIssued / totalCapacity) * 100) : 0,
  };
}

export default function AdminScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<ManagedEvent[]>([]);
  const [overview, setOverview] = useState(EMPTY_OVERVIEW);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedEvent | null>(null);
  const [draft, setDraft] = useState<AdminEventInput>(EMPTY_INPUT);
  const [deleteTarget, setDeleteTarget] = useState<ManagedEvent | null>(null);

  useEffect(() => {
    void (async () => {
      if (!await hasActiveSession()) {
        router.replace("/login");
        return;
      }
      try {
        const snapshot = await fetchAdminSnapshot();
        setEvents(snapshot.events);
        setOverview(snapshot.overview);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to open system management.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const filteredEvents = useMemo(() => events.filter((event) => {
    const haystack = `${event.title} ${event.location} ${event.venue} ${event.category}`.toLowerCase();
    const matchesQuery = haystack.includes(query.trim().toLowerCase());
    const matchesStatus = status === "all" || (status === "live" ? event.published : !event.published);
    return matchesQuery && matchesStatus;
  }), [events, query, status]);

  const updateCollection = (nextEvents: ManagedEvent[]) => {
    setEvents(nextEvents);
    setOverview(recalculate(nextEvents));
  };

  const openEditor = (event?: ManagedEvent) => {
    setEditing(event ?? null);
    setDraft(formInput(event));
    setError(null);
    setNotice(null);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    if (busyId === "editor") return;
    setEditorOpen(false);
    setEditing(null);
  };

  const saveEvent = async () => {
    setBusyId("editor");
    setError(null);
    setNotice(null);
    try {
      const payload = { ...draft, startsAt: new Date(draft.startsAt).toISOString() };
      const saved = editing
        ? await updateManagedEvent(editing.id, payload)
        : await createManagedEvent(payload);
      const nextEvents = editing
        ? events.map((event) => event.id === saved.id ? saved : event)
        : [...events, saved];
      updateCollection(nextEvents.sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime()));
      setEditorOpen(false);
      setEditing(null);
      setNotice(`${saved.title} was ${editing ? "updated" : "created"} successfully.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save the event.");
    } finally {
      setBusyId(null);
    }
  };

  const togglePublishing = async (event: ManagedEvent) => {
    setBusyId(event.id);
    setError(null);
    setNotice(null);
    try {
      const updated = await updateManagedEvent(event.id, { ...formInput(event), startsAt: event.startsAt, published: !event.published });
      updateCollection(events.map((item) => item.id === event.id ? updated : item));
      setNotice(`${event.title} is now ${updated.published ? "live" : "a draft"}.`);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "Unable to update publishing.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    setError(null);
    try {
      await deleteManagedEvent(deleteTarget.id);
      updateCollection(events.filter((event) => event.id !== deleteTarget.id));
      setNotice(`${deleteTarget.title} was deleted.`);
      setDeleteTarget(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete the event.");
      setDeleteTarget(null);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <main className={styles.loading}><span /><p>Synchronising command centre…</p></main>;

  if (error === "Administrator access is required.") {
    return <main className={styles.denied}><span>401 / ACCESS LAYER</span><h1>This workspace is for administrators.</h1><p>Your account is signed in, but it has not been assigned the admin role.</p><Link href="/dashboard">Return to dashboard</Link></main>;
  }

  return (
    <main className={styles.shell}>
      <aside className={styles.rail}>
        <Link className={styles.brand} href="/">eTicket<span>.</span></Link>
        <nav aria-label="Management navigation">
          <a className={styles.active} href="#overview"><i>⌘</i><span>Command</span></a>
          <a href="#inventory"><i>◇</i><span>Events</span></a>
          <Link href="/dashboard"><i>▦</i><span>Customer view</span></Link>
        </nav>
        <button type="button" onClick={() => void signOut().then(() => router.replace("/login"))}><i>↗</i><span>Sign out</span></button>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <div><span className={styles.liveDot} /> SYSTEM ONLINE <b>/</b> SOLOMON ISLANDS</div>
          <div className={styles.topActions}><Link href="/" target="_blank">View live site ↗</Link><button type="button" onClick={() => openEditor()}>＋ New event</button></div>
        </header>

        <section className={styles.hero} id="overview">
          <div><span className={styles.eyebrow}>PLATFORM CONTROL / 01</span><h1>Shape what the<br/><em>world discovers.</em></h1><p>Create, publish, and monitor experiences from Honiara across the Pacific and beyond.</p></div>
          <div className={styles.orbit} aria-hidden="true"><span>{overview.liveEvents.toString().padStart(2, "0")}</span><small>LIVE SIGNALS</small></div>
        </section>

        <section className={styles.metrics} aria-label="Platform overview">
          <article><span>01 / CATALOGUE</span><strong>{overview.totalEvents.toString().padStart(2, "0")}</strong><p>Total events</p></article>
          <article><span>02 / TRANSMITTING</span><strong>{overview.liveEvents.toString().padStart(2, "0")}</strong><p>Published events</p></article>
          <article><span>03 / TICKETS</span><strong>{overview.ticketsIssued.toLocaleString()}</strong><p>Tickets issued</p></article>
          <article><span>04 / OCCUPANCY</span><strong>{overview.occupancyRate}%</strong><p>{overview.totalCapacity.toLocaleString()} total capacity</p></article>
        </section>

        {error ? <div className={styles.alert} role="alert"><span>!</span>{error}<button type="button" onClick={() => setError(null)}>Dismiss</button></div> : null}
        {notice ? <div className={styles.notice} role="status"><span>✓</span>{notice}<button type="button" onClick={() => setNotice(null)}>Dismiss</button></div> : null}

        <section className={styles.inventory} id="inventory">
          <div className={styles.sectionHead}>
            <div><span className={styles.eyebrow}>EVENT INVENTORY / 02</span><h2>Your experience network.</h2></div>
            <button type="button" onClick={() => openEditor()}>Create event <b>↗</b></button>
          </div>
          <div className={styles.toolbar}>
            <label><span>SEARCH</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Event, venue, or location…" /></label>
            <div role="group" aria-label="Filter event status">
              {(["all", "live", "draft"] as StatusFilter[]).map((item) => <button key={item} type="button" aria-pressed={status === item} className={status === item ? styles.filterActive : ""} onClick={() => setStatus(item)}>{item} <span>{item === "all" ? overview.totalEvents : item === "live" ? overview.liveEvents : overview.draftEvents}</span></button>)}
            </div>
          </div>

          <div className={styles.eventList}>
            {filteredEvents.map((event) => {
              const soldPercent = Math.round((event.ticketsSold / event.capacity) * 100);
              return <article key={event.id} className={styles.eventRow}>
                <div className={styles.thumbnail} style={{ backgroundImage: `linear-gradient(135deg, transparent, rgba(0,0,0,.55)), url(${JSON.stringify(event.imageUrl).slice(1, -1)})` }}><span>{event.category}</span></div>
                <div className={styles.eventIdentity}><span className={event.published ? styles.live : styles.draft}>{event.published ? "LIVE" : "DRAFT"}</span><h3>{event.title}</h3><p>{event.venue} · {event.location}</p></div>
                <div className={styles.eventDate}><span>DATE / TIME</span><strong>{new Date(event.startsAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</strong><p>{new Date(event.startsAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</p></div>
                <div className={styles.sales}><span>{event.ticketsSold.toLocaleString()} / {event.capacity.toLocaleString()} TICKETS</span><div><i style={{ width: `${soldPercent}%` }} /></div><p>{soldPercent}% occupied · {formatMoney(event.priceCents, event.currency)}</p></div>
                <div className={styles.rowActions}><button type="button" disabled={busyId === event.id} onClick={() => void togglePublishing(event)}>{busyId === event.id ? "…" : event.published ? "Unpublish" : "Publish"}</button><button type="button" onClick={() => openEditor(event)}>Edit</button><button type="button" className={styles.danger} disabled={event.ticketsSold > 0} title={event.ticketsSold > 0 ? "Unpublish events that already have tickets" : "Delete event"} onClick={() => setDeleteTarget(event)}>×</button></div>
              </article>;
            })}
            {!filteredEvents.length ? <div className={styles.empty}><span>◎</span><h3>No event signals found</h3><p>Change your search or create a new experience.</p></div> : null}
          </div>
        </section>
      </div>

      {editorOpen ? <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeEditor(); }}>
        <section className={styles.editor} role="dialog" aria-modal="true" aria-labelledby="event-editor-title">
          <header><div><span className={styles.eyebrow}>{editing ? "EDIT SIGNAL" : "NEW SIGNAL"}</span><h2 id="event-editor-title">{editing ? "Update event" : "Create an event"}</h2></div><button type="button" aria-label="Close event editor" onClick={closeEditor}>×</button></header>
          <form onSubmit={(event) => { event.preventDefault(); void saveEvent(); }}>
            <div className={styles.formGrid}>
              <label className={styles.full}>Event name<input required minLength={2} maxLength={140} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Solomon Islands Music Festival" /></label>
              <label>Category<input required value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} placeholder="Festival" /></label>
              <label>Date &amp; time<input required type="datetime-local" value={draft.startsAt} onChange={(event) => setDraft({ ...draft, startsAt: event.target.value })} /></label>
              <label>Venue<input required value={draft.venue} onChange={(event) => setDraft({ ...draft, venue: event.target.value })} placeholder="Heritage Park" /></label>
              <label>Location<input required value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} placeholder="Honiara, Solomon Islands" /></label>
              <label>Price (major units)<input required type="number" min="0" step="0.01" value={(draft.priceCents / 100).toString()} onChange={(event) => setDraft({ ...draft, priceCents: Math.round(Number(event.target.value) * 100) })} /></label>
              <label>Currency<input required minLength={3} maxLength={3} value={draft.currency} onChange={(event) => setDraft({ ...draft, currency: event.target.value.toUpperCase() })} placeholder="SBD" /></label>
              <label>Capacity<input required type="number" min={editing?.ticketsSold ? editing.ticketsSold : 1} step="1" value={draft.capacity} onChange={(event) => setDraft({ ...draft, capacity: Number(event.target.value) })} /></label>
              <label className={styles.full}>Cover image URL<input required type="url" value={draft.imageUrl} onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value })} /></label>
              <label className={styles.full}>Description<textarea maxLength={2000} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Tell guests what makes this event remarkable." /></label>
            </div>
            <div className={styles.switches}><label><input type="checkbox" checked={draft.featured} onChange={(event) => setDraft({ ...draft, featured: event.target.checked })} /><span />Feature on discovery</label><label><input type="checkbox" checked={draft.published} onChange={(event) => setDraft({ ...draft, published: event.target.checked })} /><span />Publish immediately</label></div>
            <footer><p>{editing?.ticketsSold ? `${editing.ticketsSold} tickets have already been issued. Capacity cannot be set below this number.` : "Save as a draft or publish it directly to the live event catalogue."}</p><div><button type="button" onClick={closeEditor}>Cancel</button><button type="submit" disabled={busyId === "editor"}>{busyId === "editor" ? "Saving…" : editing ? "Save changes" : "Create event"}</button></div></footer>
          </form>
        </section>
      </div> : null}

      {deleteTarget ? <div className={styles.modalBackdrop}><section className={styles.confirm} role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><span>DESTRUCTIVE ACTION</span><h2 id="delete-title">Delete {deleteTarget.title}?</h2><p>This permanently removes the draft event. This action cannot be undone.</p><div><button type="button" onClick={() => setDeleteTarget(null)}>Keep event</button><button type="button" onClick={() => void confirmDelete()}>Delete permanently</button></div></section></div> : null}
    </main>
  );
}
