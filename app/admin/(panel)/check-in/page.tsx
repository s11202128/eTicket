import type { Metadata } from "next";
import CheckInScannerScreen from "@/features/admin/view/CheckInScannerScreen";

export const metadata: Metadata = { title: "Check-in" };

export default function AdminCheckInPage() {
  return <CheckInScannerScreen />;
}
