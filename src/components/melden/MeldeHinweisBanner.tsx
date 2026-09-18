/** Hinweis-Banner für Melde-Flow (z. B. objekt_nicht_gefunden). */
export function MeldeHinweisBanner({ text }: { text: string }) {
  return (
    <p
      role="status"
      className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
    >
      {text}
    </p>
  )
}
