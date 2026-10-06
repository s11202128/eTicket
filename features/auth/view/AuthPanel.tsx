import type { ReactNode } from "react";

// Shared frame for login, signup and password pages.
export function AuthPanel({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto grid max-w-md gap-6 px-4 py-14 sm:py-20">
      <div className="grid gap-2 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
        {subtitle ? <p className="text-muted">{subtitle}</p> : null}
      </div>
      <div className="rounded-xl border border-border bg-surface p-6 sm:p-8">{children}</div>
      {footer ? <div className="text-center text-sm text-muted">{footer}</div> : null}
    </div>
  );
}

export function FormMessage({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={
        tone === "error"
          ? "rounded-md border border-danger/40 bg-danger-bg p-3 text-sm font-medium text-danger"
          : "rounded-md border border-success/40 bg-success-bg p-3 text-sm font-medium text-success"
      }
    >
      {children}
    </p>
  );
}
