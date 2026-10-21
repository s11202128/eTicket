import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/siteConfig";
import { FaqAccordion, type FaqItem } from "@/features/site/view/FaqAccordion";
import { InfoPage } from "@/features/site/view/InfoPage";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description: `Answers about booking, tickets, check-in and hosting events on ${siteConfig.name}.`,
};

const { currency } = siteConfig;

// Keep these in step with how booking, check-in and reviews really work
// (see supabase/migrations).
const BUYER_FAQ: FaqItem[] = [
  {
    question: "How do I book a ticket?",
    answer: (
      <p>
        Open an event, choose a ticket type and how many you need, then confirm. You need a free account to book, so
        your tickets are saved to <Link href="/tickets">My Tickets</Link> and you get a confirmation in your
        notifications.
      </p>
    ),
  },
  {
    question: "How many tickets can I buy?",
    answer: (
      <p>
        Each event has a limit per person, set by its organizer (often 4). It counts every ticket you hold for that
        event, so you can&apos;t get around it with several bookings. You can book up to 10 tickets at a time.
      </p>
    ),
  },
  {
    question: "Why can't I buy a certain ticket type yet?",
    answer: (
      <p>
        Organizers can give each ticket type its own sales window, for example an early-bird price that ends on a set
        date, or a release that opens later. Outside its window a ticket type can&apos;t be booked. Each type can also
        sell out on its own while others are still available.
      </p>
    ),
  },
  {
    question: "What currency are prices in?",
    answer: (
      <p>
        All prices are in {currency.name} ({currency.code}), shown as {currency.symbol}. If a service fee applies, it
        is added to the total you see before you confirm.
      </p>
    ),
  },
  {
    question: "How do I pay?",
    answer: (
      <p>
        Online payment isn&apos;t switched on yet: we&apos;re still connecting a payment provider. Until then the site
        runs in test mode, so bookings are confirmed straight away and no money is taken. Once online payment is live,
        the accepted methods will be listed at the bottom of every page.
      </p>
    ),
  },
  {
    question: "How do I get into the event?",
    answer: (
      <p>
        Show the QR code on your ticket at the door, on your phone or printed. You can also save it as an image or PDF.
        Staff scan it once and it&apos;s marked as used, so a copy can&apos;t be used again. Scanning opens a few hours
        before the event starts. If the code won&apos;t scan, staff can type in the ticket code shown under it.
      </p>
    ),
  },
  {
    question: "Can I cancel my ticket?",
    answer: (
      <p>
        Yes, from <Link href="/tickets">My Tickets</Link>, any time before the event starts. After the start time
        tickets can&apos;t be cancelled. A cancelled ticket stops working and the place goes back on sale. See our{" "}
        <Link href="/refunds">refund and cancellation policy</Link> for what happens next.
      </p>
    ),
  },
  {
    question: "What if the event is cancelled?",
    answer: (
      <p>
        All its tickets are cancelled automatically and you get a notification. Our{" "}
        <Link href="/refunds">refund and cancellation policy</Link> explains refunds.
      </p>
    ),
  },
  {
    question: "Someone else is going in my place. What do I do?",
    answer: (
      <p>
        Tickets are linked to the account that booked them and each one admits one person, once. Copying or reselling
        tickets isn&apos;t allowed (see our <Link href="/terms">terms</Link>). If you need help with a booking,{" "}
        <Link href="/contact">contact us</Link> with your ticket code.
      </p>
    ),
  },
];

const ORGANIZER_FAQ: FaqItem[] = [
  {
    question: "How do I start selling tickets?",
    answer: (
      <p>
        <Link href="/signup?type=organizer">Apply as an organizer</Link> with a few details about your organization.
        Our team reviews every application and you&apos;re notified of the decision. Once approved you get an organizer
        dashboard to create events.
      </p>
    ),
  },
  {
    question: "Are events checked before they go on sale?",
    answer: (
      <>
        <p>
          Yes. You build the event as a draft, then submit it for review. To submit, it needs a description, a start
          date in the future and at least one ticket type. An admin then approves it, asks for changes or turns it
          down, and you&apos;re told either way. Approved events go on sale straight away.
        </p>
        <p>
          After it&apos;s live you can still update the description and image freely. Changing the title, date, venue,
          region, category, prices, the per-person limit, or lowering how many tickets are available sends the event
          back for a quick review, and it&apos;s off sale until it&apos;s approved again. Tickets already sold stay
          valid.
        </p>
      </>
    ),
  },
  {
    question: "What can I set up for tickets?",
    answer: (
      <p>
        Add one or more ticket types, each with its own name, price in {currency.code}, number available (or no
        limit) and an optional sales window. Sales have to end before the event does. You also choose how many tickets
        one person can hold for the event.
      </p>
    ),
  },
  {
    question: "How does check-in work?",
    answer: (
      <p>
        You and the door staff you add on the Team page scan guests&apos; QR codes with a phone from the organizer
        dashboard. Each ticket is accepted once, and the scanner tells you straight away if a ticket was already used,
        cancelled or is for another event. Staff can only check in for the events you add them to.
      </p>
    ),
  },
  {
    question: "How do I get paid?",
    answer: (
      <p>
        Online payment isn&apos;t set up yet, so no money is collected through the site for now and there are no
        payouts to manage. <Link href="/contact">Contact us</Link> if you want to talk about selling paid tickets.
      </p>
    ),
  },
  {
    question: "Can I cancel my event?",
    answer: (
      <p>
        Request a cancellation from your dashboard, optionally with a reason. An admin reviews the request: cancelling
        the event cancels every ticket and notifies the holders. Our <Link href="/refunds">refund policy</Link>{" "}
        explains what ticket holders can expect.
      </p>
    ),
  },
];

export default function FaqPage() {
  return (
    <InfoPage title="Frequently Asked Questions" intro="Quick answers about booking tickets and hosting events.">
      <section aria-labelledby="faq-buyers" className="grid gap-4">
        <h2 id="faq-buyers">For ticket buyers</h2>
        <FaqAccordion items={BUYER_FAQ} />
      </section>

      <section aria-labelledby="faq-organizers" className="grid gap-4">
        <h2 id="faq-organizers">For event organizers</h2>
        <FaqAccordion items={ORGANIZER_FAQ} />
      </section>

      <p>
        Still stuck? <Link href="/contact">Contact us</Link> and we&apos;ll help.
      </p>
    </InfoPage>
  );
}
