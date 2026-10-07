import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/features/site/view/InfoPage";

export const metadata: Metadata = { title: "Refunds, Returns & Cancellation Policy" };

export default function RefundsPage() {
  return (
    <InfoPage
      title="Refunds, Returns & Cancellation Policy"
      intro="What happens if you cancel a ticket or an event is cancelled."
      templateFile="app/(public)/refunds/page.tsx"
    >
      <h2>Cancelling your ticket</h2>
      <p>
        You can cancel an active ticket yourself from <Link href="/tickets">My Tickets</Link> any time before the
        event starts. Once an event has started, tickets can no longer be cancelled. A cancelled ticket stops working
        and the seat is released to other people.
      </p>

      <h2>If an event is cancelled</h2>
      <p>
        If an organiser cancels an event, all tickets for it are cancelled automatically and you receive a
        notification. [Explain how and when refunds are paid.]
      </p>

      <h2>If an event changes</h2>
      <p>[Explain what happens if the date, time or venue changes.]</p>

      <h2>Refunds</h2>
      <p>[Explain who is eligible for a refund, how to request one and how long it takes.]</p>

      <h2>Need help?</h2>
      <p>
        <Link href="/contact">Contact us</Link> with your ticket code and we&apos;ll help.
      </p>
    </InfoPage>
  );
}
