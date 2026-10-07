"use client";

import { useEffect } from "react";

// Replaces the root layout when it fails, so it brings its own <html>/<body>
// and inline styles (global CSS isn't loaded here).
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#0b1120",
          color: "#f8fafc",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: 16,
        }}
      >
        <title>Something went wrong · E-Ticket</title>
        <div role="alert">
          <h1 style={{ fontSize: 24 }}>Something went wrong</h1>
          <p style={{ color: "#a3b1c6" }}>Please try again in a moment.</p>
          <button
            type="button"
            onClick={retry}
            style={{
              marginTop: 12,
              padding: "10px 18px",
              border: 0,
              borderRadius: 10,
              background: "#ff5a4e",
              color: "#0f172a",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest ? <p style={{ fontSize: 12, color: "#a3b1c6" }}>Error reference: {error.digest}</p> : null}
        </div>
      </body>
    </html>
  );
}
