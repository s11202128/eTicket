import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Event Manager", robots: { index: false } };

// Approved organizers only (proxy.ts). Placeholder until the dashboard lands.
export default function ManagerHomePage() {
  return (
    <div className="mx-auto grid max-w-3xl gap-6 px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Event Manager</h1>
      <EmptyState
        title="Your dashboard is almost ready"
        description="You're approved to host events. Event creation, sales and check-in tools are coming in the next update."
        action={
          <ButtonLink href="/events" variant="secondary">
            Browse events
          </ButtonLink>
        }
      />
    </div>
  );
}
