import { ImageResponse } from "next/og";

// Square brand mark for the favicon, home-screen icons and the web manifest.
export const ICON_BACKGROUND = "#0b1120";

export function appIconResponse(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: ICON_BACKGROUND,
          color: "#f8fafc",
          fontSize: size * 0.5,
          fontWeight: 800,
          letterSpacing: -size * 0.02,
        }}
      >
        E<span style={{ color: "#ff5a4e" }}>·</span>T
      </div>
    ),
    { width: size, height: size }
  );
}
