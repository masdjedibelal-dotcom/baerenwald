'use client'

export function DruckenKnopf() {
  return (
    <button type="button" className="ah-drucken" onClick={() => window.print()}>
      Drucken
    </button>
  )
}
