"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { ticketQrDataUrl } from "@/lib/qr";
import { cn } from "@/lib/cn";

// QR generated locally in the browser.
export function TicketQr({ code, size, dimmed = false }: { code: string; size: number; dimmed?: boolean }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void ticketQrDataUrl(code, size * 2).then((url) => {
      if (active) setSrc(url);
    });
    return () => {
      active = false;
    };
  }, [code, size]);

  if (!src) {
    return (
      <div style={{ width: size, height: size }}>
        <Skeleton className="size-full rounded-md" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- data URL, nothing to optimise
    <img
      src={src}
      alt={`QR code for ticket ${code}`}
      width={size}
      height={size}
      className={cn("rounded-md bg-white p-1.5", dimmed && "opacity-30 grayscale")}
      style={{ width: size, height: size }}
    />
  );
}
