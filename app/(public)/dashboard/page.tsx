import { redirect } from "next/navigation";

// The old dashboard was replaced by "My tickets".
export default function DashboardPage() {
  redirect("/tickets");
}
