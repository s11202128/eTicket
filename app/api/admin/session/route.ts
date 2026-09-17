import { authenticateAdminRequest } from "@/lib/server/api";

export async function GET(request: Request) {
  const auth = await authenticateAdminRequest(request);
  if (auth instanceof Response) return auth;
  return Response.json({ authorized: true });
}
