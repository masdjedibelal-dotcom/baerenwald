"use client";
import { PALETTE } from "@/lib/tokens/palette";

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
          color: "var(--p2-primary)",
          margin: "0 0 0.75rem",
        }}
      >
        Fehler
      </p>
      <h1
        style={{
          margin: "0 0 0.75rem",
          fontSize: "clamp(1.5rem, 4vw, 2rem)",
          fontWeight: 800,
          color: "var(--p2-primary-dk)",
        }}
      >
        Etwas ist schiefgelaufen
      </h1>
      <p style={{ margin: "0 0 1.75rem", maxWidth: 420, color: PALETTE.h524e4a, lineHeight: 1.6 }}>
        Bitte Seite neu laden. Wenn das Problem bleibt, starte den Browser-Tab neu.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: "0.75rem 1.375rem",
            borderRadius: 999,
            border: "none",
            background: "var(--p2-primary)",
            color: "var(--p2-panel)",
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
            padding: "0.75rem 1.375rem",
            borderRadius: 999,
            border: "0.125rem solid var(--p2-primary)",
            color: "var(--p2-primary-dk)",
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
