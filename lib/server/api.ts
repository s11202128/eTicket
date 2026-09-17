import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export type AuthenticatedRequest = {
  client: SupabaseClient | null;
  user: User | { id: string; email: string };
  demo: boolean;
  demoAdmin: boolean;
};

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export function isServerDemoMode() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export function createServerClient(accessToken?: string): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  return createClient(url, anonKey, {
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function authenticateRequest(
  request: Request,
): Promise<AuthenticatedRequest | Response> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";

  if (isServerDemoMode() && (token === "demo-session" || token === "demo-admin-session")) {
    return {
      client: null,
      demo: true,
      demoAdmin: token === "demo-admin-session",
      user: { id: "00000000-0000-4000-8000-000000000001", email: "alex@example.com" },
    };
  }

  if (!token) return jsonError("Authentication required.", 401);

  const client = createServerClient(token);
  if (!client) return jsonError("The database is not configured.", 503);

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return jsonError("Your session is invalid or expired.", 401);

  return { client, user: data.user, demo: false, demoAdmin: false };
}

export async function authenticateAdminRequest(
  request: Request,
): Promise<AuthenticatedRequest | Response> {
  const auth = await authenticateRequest(request);
  if (auth instanceof Response) return auth;
  if (auth.demo) {
    return auth.demoAdmin ? auth : jsonError("Administrator access is required.", 403);
  }

  const { data, error } = await auth.client!
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (error) return jsonError("Unable to verify administrator access.", 500);
  if (data?.role !== "admin") return jsonError("Administrator access is required.", 403);
  return auth;
}
