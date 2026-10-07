import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/siteConfig";
import { InfoPage } from "@/features/site/view/InfoPage";

export const metadata: Metadata = { title: "Terms and Conditions" };

export default function TermsPage() {
  return (
    <InfoPage
      title="Terms and Conditions"
      intro={`The rules for using ${siteConfig.name} and booking tickets.`}
      templateFile="app/(public)/terms/page.tsx"
    >
      <h2>1. Using the site</h2>
      <p>
        By creating an account or booking a ticket you agree to these terms. You are responsible for keeping your
        login details private and for all activity on your account.
      </p>

      <h2>2. Tickets</h2>
      <ul>
        <li>Each ticket has a unique code and QR code and admits one person, once.</li>
        <li>Event organisers may limit how many tickets one person can book.</li>
        <li>Tickets are personal. Copying or reselling tickets may lead to them being cancelled.</li>
        <li>Bring your ticket (on your phone or printed) to the venue. Staff scan it at the entrance.</li>
      </ul>

      <h2>3. Event changes and cancellations</h2>
      <p>
        Organisers may change or cancel events. If an event is cancelled, your ticket is cancelled and you are
        notified. See the <Link href="/refunds">Refunds, Returns &amp; Cancellation Policy</Link>.
      </p>

      <h2>4. Prices</h2>
      <p>
        Prices are shown in {siteConfig.currency.name} ({siteConfig.currency.code}) unless otherwise specified.
      </p>

      <h2>5. Liability</h2>
      <p>[Describe your liability limits here.]</p>

      <h2>6. Contact</h2>
      <p>
        Questions about these terms? <Link href="/contact">Contact us</Link>.
      </p>
    </InfoPage>
  );
}
