import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { siteConfig } from "@/lib/siteConfig";

export type AuthAudience = "book" | "manager";

const ARTWORK: Record<AuthAudience, { src: string; heading: string; body: string }> = {
  book: {
    src: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1400&q=80",
    heading: "Every great night out starts here.",
    body: "Concerts, sports, festivals and more across the Solomon Islands and the Pacific. Your tickets live on your phone.",
  },
  manager: {
    src: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=80",
    heading: "Sell out your next event.",
    body: "Publish events, sell tickets by type, follow sales live and check guests in at the door with any phone.",
  },
};

// Login and signup: big event image with a brand message on the left (hidden
// on small screens), the form on the right.
export function AuthSplitLayout({ audience, children }: { audience: AuthAudience; children: ReactNode }) {
  const art = ARTWORK[audience];

  return (
    <div className="mx-auto grid max-w-6xl gap-0 px-4 py-8 sm:px-6 lg:min-h-[calc(100vh-4rem)] lg:grid-cols-2 lg:gap-10 lg:py-10">
      <div className="relative hidden overflow-hidden rounded-2xl lg:block">
        <Image
          key={art.src}
          src={art.src}
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 0px"
          className="object-cover"
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 grid gap-3 p-10 text-white">
          <p className="text-sm font-bold uppercase tracking-widest text-white/70">{siteConfig.name}</p>
          <p className="text-4xl font-extrabold leading-tight tracking-tight">{art.heading}</p>
          <p className="max-w-md text-white/80">{art.body}</p>
        </div>
      </div>
      <div className="grid content-center">
        <div className="mx-auto grid w-full max-w-md gap-6 py-6">{children}</div>
      </div>
    </div>
  );
}

// "Book tickets" | "Manage events" switch at the top of the login form.
export function AudienceToggle({
  value,
  onChange,
  labels = { book: "Book tickets", manager: "Manage events" },
}: {
  value: AuthAudience;
  onChange: (value: AuthAudience) => void;
  labels?: Record<AuthAudience, string>;
}) {
  return (
    <div role="group" aria-label="What do you want to do?" className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface p-1">
      {(["book", "manager"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={cn(
            "h-10 rounded-md text-sm font-semibold transition-colors",
            value === option ? "bg-accent text-on-accent" : "text-muted hover:text-fg"
          )}
        >
          {labels[option]}
        </button>
      ))}
    </div>
  );
}

export function AuthHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="grid gap-2">
      <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
      {subtitle ? <p className="text-muted">{subtitle}</p> : null}
    </div>
  );
}
