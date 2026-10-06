import { redirect } from "next/navigation";

// Check-in moved to the admin area (staff and admins only).
export default function CheckInPage() {
  redirect("/admin/check-in");
}
