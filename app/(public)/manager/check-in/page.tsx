import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Check-in", robots: { index: false } };

// Organizers, door staff and admins (proxy.ts). Placeholder until the
// per-event scanner lands with the manager dashboard.
export default function ManagerCheckInPage() {
  return (
    <div className="mx-auto grid max-w-3xl gap-6 px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Check-in</h1>
      <EmptyState
        title="Scanner coming soon"
        description="You'll be able to choose your event and scan tickets here in the next update."
        action={
          <ButtonLink href="/tickets" variant="secondary">
            My tickets
          </ButtonLink>
        }
      />
    </div>
  );
}
