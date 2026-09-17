import { authenticateRequest, jsonError } from "@/lib/server/api";
import { getDemoState } from "@/lib/server/demo-store";

export async function PATCH(request: Request) {
  const auth = await authenticateRequest(request);
  if (auth instanceof Response) return auth;

  let body: { displayName?: unknown; phone?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  if (displayName.length < 2 || displayName.length > 80 || phone.length > 30) {
    return jsonError("Enter a valid name and phone number.", 400);
  }

  if (auth.demo) {
    const demoState = getDemoState();
    demoState.profile = { ...demoState.profile, displayName, phone };
    return Response.json({ profile: demoState.profile });
  }

  const { error } = await auth.client!
    .from("profiles")
    .update({ full_name: displayName, phone })
    .eq("id", auth.user.id);

  if (error) return jsonError("Unable to save your profile.", 500);
  return Response.json({ profile: { displayName, phone } });
}
