/** Hinweis-Banner für Melde-Flow (z. B. objekt_nicht_gefunden). */
export function MeldeHinweisBanner({ text }: { text: string }) {
  return (
    <p
      role="status"
      className="mb-4 rounded-card border border-warning-border bg-warning-bg px-3 py-2 text-sm text-warning-text"
    >
      {text}
    </p>
  )
}
