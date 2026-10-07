import type { ReactNode } from "react";

type InfoPageProps = {
  title: string;
  intro?: string;
  updated?: string;
  // Legal pages: file to edit, shown in a notice until real text replaces the template.
  templateFile?: string;
  children: ReactNode;
};

// Layout for static text pages (terms, privacy, about, ...).
export function InfoPage({ title, intro, updated, templateFile, children }: InfoPageProps) {
  return (
    <article className="mx-auto grid max-w-3xl gap-6 px-4 py-12 sm:px-6">
      <header className="grid gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
        {intro ? <p className="text-lg text-muted">{intro}</p> : null}
        {updated ? <p className="text-sm text-muted">Last updated: {updated}</p> : null}
      </header>
      {templateFile ? (
        <p role="note" className="rounded-lg border border-warning/40 bg-warning-bg p-4 text-sm font-medium text-warning">
          Template text. Replace this page with your own policy (reviewed by a legal adviser) before taking real
          bookings. Edit it in <code className="font-mono">{templateFile}</code>.
        </p>
      ) : null}
      <div className="grid gap-5 leading-relaxed text-muted [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-fg [&_a]:font-semibold [&_a]:text-accent-text [&_a:hover]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:grid [&_ul]:gap-1.5">
        {children}
      </div>
    </article>
  );
}
