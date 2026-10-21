import type { Metadata } from "next";
import ContactMessagesScreen from "@/features/admin/view/ContactMessagesScreen";

export const metadata: Metadata = { title: "Messages" };

export default function Page() {
  return <ContactMessagesScreen />;
}
