import { supabase } from "@/lib/supabase";
import type { OrganizerStatus, UserRole } from "@/lib/database.types";

// Who is signed in, loaded in the browser. Public pages are cached and shared
// between visitors, so they can't know the visitor on the server; the header
// and booking panel read this instead. For display only: the database still
// checks every action.

export type ClientViewer = {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  role: UserRole;
  organizerStatus: OrganizerStatus | null;
  isStaff: boolean;
};

export type ViewerState =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "signed_in"; viewer: ClientViewer };

const LOADING: ViewerState = { status: "loading" };
const SIGNED_OUT: ViewerState = { status: "signed_out" };

let state: ViewerState = LOADING;
let started = false;
let loadId = 0;
const listeners = new Set<() => void>();

function setState(next: ViewerState) {
  state = next;
  listeners.forEach((listener) => listener());
}

async function load(userId: string | null) {
  const id = ++loadId;
  if (!userId) {
    setState(SIGNED_OUT);
    return;
  }

  const [{ data: profile }, { data: access }] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, avatar_url, role").eq("id", userId).maybeSingle(),
    supabase.rpc("get_my_access"),
  ]);
  // A newer sign-in or sign-out happened while this was loading.
  if (id !== loadId) return;
  if (!profile) {
    setState(SIGNED_OUT);
    return;
  }

  const row = access?.[0];
  setState({
    status: "signed_in",
    viewer: {
      id: profile.id,
      name: profile.full_name || profile.email || "Account",
      email: profile.email,
      avatarUrl: profile.avatar_url,
      // Effective role: 'admin' only for authorized admin emails.
      role: (row?.role ?? profile.role) as UserRole,
      organizerStatus: (row?.organizer_status as OrganizerStatus | null | undefined) ?? null,
      isStaff: (row?.staff_event_count ?? 0) > 0,
    },
  });
}

function start() {
  if (started) return;
  started = true;
  // Fires once with the stored session (INITIAL_SESSION), then on every
  // sign-in, sign-out and profile change, in this tab and others.
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "TOKEN_REFRESHED") return;
    // Supabase advises against awaiting other calls inside this callback.
    window.setTimeout(() => {
      void load(session?.user.id ?? null).catch(() => setState(SIGNED_OUT));
    }, 0);
  });
}

export function subscribeViewer(listener: () => void): () => void {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getViewerState(): ViewerState {
  return state;
}

// Server render and first client render: not known yet.
export function getServerViewerState(): ViewerState {
  return LOADING;
}

// After a profile edit, so the header picks up the new name or photo.
export function reloadViewer(): void {
  void supabase.auth.getSession().then(({ data }) => load(data.session?.user.id ?? null));
}
