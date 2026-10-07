import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
};

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="grid justify-items-center gap-3 rounded-lg border border-dashed border-border bg-surface px-6 py-12 text-center">
      {icon ? (
        <div aria-hidden className="text-3xl">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-bold text-fg">{title}</h3>
      {description ? <p className="max-w-md text-sm text-muted">{description}</p> : null}
      {action}
    </div>
  );
}
