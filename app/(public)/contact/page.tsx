import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/siteConfig";
import { InfoPage } from "@/features/site/view/InfoPage";
import { SOCIAL_LABELS } from "@/features/site/view/SocialIcon";

export const metadata: Metadata = { title: "Contact Us" };

export default function ContactPage() {
  const { contactEmail, contactPhone, socials } = siteConfig;
  const hasDetails = Boolean(contactEmail || contactPhone || socials.length > 0);

  return (
    <InfoPage title="Contact Us" intro="Questions about an event or your tickets? We're here to help.">
      {hasDetails ? (
        <ul className="!list-none !pl-0">
          {contactEmail ? (
            <li>
              <span className="font-bold text-fg">Email: </span>
              <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
            </li>
          ) : null}
          {contactPhone ? (
            <li>
              <span className="font-bold text-fg">Phone: </span>
              <a href={`tel:${contactPhone.replace(/\s+/g, "")}`}>{contactPhone}</a>
            </li>
          ) : null}
          {socials.map((social) => (
            <li key={social.platform}>
              <span className="font-bold text-fg">{SOCIAL_LABELS[social.platform]}: </span>
              <a href={social.href} target="_blank" rel="noopener noreferrer">
                {social.href.replace(/^https?:\/\//, "")}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p role="note" className="rounded-lg border border-warning/40 bg-warning-bg p-4 text-sm font-medium text-warning">
          Contact details haven&apos;t been added yet. Set them in <code className="font-mono">lib/siteConfig.ts</code>.
        </p>
      )}

      <h2>Help with a ticket</h2>
      <p>
        Include your ticket code (shown under the QR code on your ticket) so we can find your booking quickly. You can
        see all your tickets in <Link href="/tickets">My Tickets</Link>.
      </p>
    </InfoPage>
  );
}
