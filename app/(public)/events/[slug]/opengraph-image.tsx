import { ImageResponse } from "next/og";
import { formatPrice } from "@/lib/format";
import { formatInSiteZone, SITE_NAME } from "@/lib/site";
import { getPublicEvent } from "@/features/events/model/publicEvents.server";

export const alt = "Event poster";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Params = Promise<{ slug: string }>;

// Typographic "poster" preview for link shares. Text only, so it never
// depends on the event image's format or host.
export default async function Image({ params }: { params: Params }) {
  const { slug } = await params;
  const event = await getPublicEvent(slug);

  const title = event?.title ?? "Event not found";
  const when = event
    ? formatInSiteZone(event.startsAt, { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "";
  const fontSize = title.length > 60 ? 64 : title.length > 32 ? 80 : 96;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#0b1120",
          color: "#f8fafc",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ width: 24, height: "100%", background: "#ff5a4e", display: "flex" }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", flex: 1 }}>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 800, letterSpacing: 4, color: "#ff8a80" }}>
            {SITE_NAME.toUpperCase()}
            {event?.categoryName ? `  ·  ${event.categoryName.toUpperCase()}` : ""}
          </div>
          <div style={{ display: "flex", fontSize, fontWeight: 800, lineHeight: 1.05, maxWidth: 1000 }}>{title}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 34 }}>
            {when ? <div style={{ display: "flex" }}>{when}</div> : null}
            {event ? (
              <div style={{ display: "flex", color: "#a3b1c6" }}>
                {event.location}
                {"  ·  "}
                <span style={{ color: "#f8fafc", fontWeight: 800 }}>
                  {event.status === "cancelled" ? "Cancelled" : event.isSoldOut ? "Sold out" : formatPrice(event.price)}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
