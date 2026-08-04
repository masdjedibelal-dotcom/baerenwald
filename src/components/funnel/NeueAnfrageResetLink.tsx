"use client";

/** Kompaktes Aktualisieren-Symbol (z. B. „Neue Anfrage“ / Footer „Weiter“ auf Ergebnis). */
export function RefreshIcon18({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Kein Button-Chrome: grüner Text + Icon (semantisch `button` für Tastatur/Fokus). */
export function NeueAnfrageResetLink({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="neue-anfrage-link" onClick={onClick}>
      <RefreshIcon18 className="neue-anfrage-link__icon" />
      <span>Neue Anfrage starten</span>
    </button>
  );
}
