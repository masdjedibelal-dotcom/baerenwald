"use client";

import Link from "next/link";
import { useEffect } from "react";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
        fontFamily: "var(--font-sans, system-ui, sans-serif)",
      }}
    >
      <p
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#2e7d52",
          margin: "0 0 12px",
        }}
      >
        Fehler
      </p>
      <h1
        style={{
          margin: "0 0 12px",
          fontSize: "clamp(1.5rem, 4vw, 2rem)",
          fontWeight: 800,
          color: "#1a3d2b",
        }}
      >
        Etwas ist schiefgelaufen
      </h1>
      <p style={{ margin: "0 0 28px", maxWidth: 420, color: "#524e4a", lineHeight: 1.6 }}>
        Bitte Seite neu laden. Wenn das Problem bleibt, starte den Browser-Tab neu.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: "12px 22px",
            borderRadius: 999,
            border: "none",
            background: "#2e7d52",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 15,
          }}
        >
          Erneut versuchen
        </button>
        <Link
          href="/"
          style={{
            padding: "12px 22px",
            borderRadius: 999,
            border: "2px solid #2e7d52",
            color: "#1a3d2b",
            fontWeight: 700,
            textDecoration: "none",
            fontSize: 15,
          }}
        >
          Zur Startseite
        </Link>
      </div>
    </div>
  );
}
