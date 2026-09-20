"use client";
import { PALETTE } from "@/lib/tokens/palette";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: Props) {
  return (
    <html lang="de">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          fontFamily: "system-ui, sans-serif",
          background: "var(--p2-bg)",
          color: "var(--p2-ink)",
          textAlign: "center",
        }}
      >
        <h1 style={{ margin: "0 0 0.75rem", fontSize: "1.5rem" }}>Etwas ist schiefgelaufen</h1>
        <p style={{ margin: "0 0 1.5rem", color: PALETTE.h524e4a, maxWidth: 400 }}>
          {process.env.NODE_ENV === "development" ? error.message : "Bitte Seite neu laden."}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: "0.75rem 1.5rem",
            borderRadius: 8,
            border: "none",
            background: "var(--p2-primary)",
            color: "var(--p2-panel)",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Erneut versuchen
        </button>
      </body>
    </html>
  );
}
