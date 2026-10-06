import type { Metadata } from "next";
import BookingsScreen from "@/features/admin/view/BookingsScreen";

export const metadata: Metadata = { title: "Bookings" };

export default function AdminBookingsPage() {
  return <BookingsScreen />;
}
