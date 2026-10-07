import Link from "next/link";
import { siteConfig } from "@/lib/siteConfig";
import { SOCIAL_LABELS, SocialIcon } from "@/features/site/view/SocialIcon";

const QUICK_LINKS = [
  { href: "/terms", label: "Terms and Conditions" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refunds", label: "Refunds, Returns & Cancellation Policy" },
];

const SERVICES = [
  { href: "/events", label: "Browse Events" },
  { href: "/tickets", label: "My Tickets" },
  { href: "/about", label: `About ${siteConfig.name}` },
  { href: "/contact", label: "Contact Us" },
];

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  const id = `footer-${title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <nav aria-labelledby={id}>
      <h2 id={id} className="text-sm font-bold uppercase tracking-wider text-fg">
        {title}
      </h2>
      <ul className="mt-4 grid gap-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-sm text-muted transition-colors hover:text-accent-text">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function SiteFooter() {
  const { socials, acceptedPayments, currency } = siteConfig;
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
        {/* Brand + social */}
        <div className="grid content-start gap-4">
          <Link href="/" className="text-xl font-extrabold tracking-tight">
            E<span className="text-accent">·</span>Ticket
          </Link>
          <p className="max-w-xs text-sm text-muted">{siteConfig.tagline}</p>
          {siteConfig.contactEmail || siteConfig.contactPhone ? (
            <address className="grid gap-1 text-sm not-italic text-muted">
              {siteConfig.contactEmail ? (
                <a href={`mailto:${siteConfig.contactEmail}`} className="hover:text-accent-text">
                  {siteConfig.contactEmail}
                </a>
              ) : null}
              {siteConfig.contactPhone ? (
                <a href={`tel:${siteConfig.contactPhone.replace(/\s+/g, "")}`} className="hover:text-accent-text">
                  {siteConfig.contactPhone}
                </a>
              ) : null}
            </address>
          ) : null}
          {socials.length > 0 ? (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-fg">Connect with Us</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {socials.map((social) => (
                  <li key={social.platform}>
                    {social.href ? (
                      <a
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${SOCIAL_LABELS[social.platform]} (opens in a new tab)`}
                        className="grid size-10 place-items-center rounded-full border border-border text-muted transition-colors hover:border-accent hover:text-accent-text"
                      >
                        <SocialIcon platform={social.platform} />
                      </a>
                    ) : (
                      // No URL yet: show the icon without a link.
                      <span
                        title={`${SOCIAL_LABELS[social.platform]} coming soon`}
                        className="grid size-10 place-items-center rounded-full border border-border text-muted"
                      >
                        <SocialIcon platform={social.platform} />
                        <span className="sr-only">{SOCIAL_LABELS[social.platform]} (coming soon)</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <FooterColumn title="Quick Links" links={QUICK_LINKS} />
        <FooterColumn title="Our Services" links={SERVICES} />

        {/* Payments (only methods listed in lib/siteConfig.ts) */}
        {acceptedPayments.length > 0 ? (
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-fg">Accepted Payments</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {acceptedPayments.map((method) => (
                <li
                  key={method}
                  className="rounded-md border border-border bg-bg px-3 py-1.5 text-xs font-bold tracking-wide text-fg"
                >
                  {method}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            All transactions are in {currency.name} ({currency.code}) unless otherwise specified.
          </p>
          <p>
            © {year} {siteConfig.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
