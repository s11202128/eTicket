"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
};

// Native <dialog> in modal mode: traps focus, closes on Escape and restores
// focus to the element that opened it.
export function Dialog({ open, onClose, title, description, children, footer }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onClose}
      onClick={(event) => {
        // Clicking the backdrop (the dialog element itself) closes it.
        if (event.target === ref.current) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-border bg-surface p-0 text-fg shadow-xl backdrop:bg-black/50"
    >
      <div className="grid gap-4 p-6">
        <h2 id={titleId} className="text-lg font-bold">
          {title}
        </h2>
        {description ? (
          <div id={descriptionId} className="text-sm text-muted">
            {description}
          </div>
        ) : null}
        {children}
        {footer ? <div className="flex flex-wrap justify-end gap-2">{footer}</div> : null}
      </div>
    </dialog>
  );
}

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  tone = "danger",
  isLoading,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant={tone} onClick={onConfirm} isLoading={isLoading} autoFocus>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}

// Small helper for "confirm before doing X" flows.
export function useConfirm<T>() {
  const [pending, setPending] = useState<T | null>(null);
  return {
    pending,
    ask: (value: T) => setPending(value),
    close: () => setPending(null),
  };
}
