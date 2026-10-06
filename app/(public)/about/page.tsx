import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { siteConfig } from "@/lib/siteConfig";
import { InfoPage } from "@/features/site/view/InfoPage";

export const metadata: Metadata = {
  title: `About ${siteConfig.name}`,
  description: siteConfig.tagline,
};

const FEATURES = [
  { title: "Book in seconds", text: "Pick an event, tap Book, and your ticket is ready right away." },
  { title: "Tickets on your phone", text: "Every ticket has its own QR code. Download it as an image or PDF, or add the event to your calendar." },
  { title: "Fast, secure entry", text: "Staff scan your QR code at the door. Each ticket works once, so copies can't be used." },
  { title: "Stay in the loop", text: "Booking confirmations and event updates arrive in your notifications." },
];

export default function AboutPage() {
  return (
    <InfoPage title={`About ${siteConfig.name}`} intro={siteConfig.tagline}>
      <p>
        {siteConfig.name} is an online ticketing platform for live events: concerts, sports, festivals, shows and
        more. Browse what&apos;s on, book in a few taps and keep all your tickets in one place.
      </p>

      <h2>Why {siteConfig.name}</h2>
      <ul className="!list-none !pl-0 sm:!grid-cols-2">
        {FEATURES.map((feature) => (
          <li key={feature.title} className="rounded-xl border border-border bg-surface p-5">
            <p className="font-bold text-fg">{feature.title}</p>
            <p className="mt-1 text-sm">{feature.text}</p>
          </li>
        ))}
      </ul>

      <div>
        <ButtonLink href="/events" size="lg">
          Browse events
        </ButtonLink>
      </div>
    </InfoPage>
  );
}
