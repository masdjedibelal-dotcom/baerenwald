'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

import { MockIcon } from '@/teo/arbeitsplatz/kit'

/**
 * ⓘ neben einer Überschrift — Erklärtext erst beim Antippen (statt Absatz in der Karte).
 * Einheitlich für Arbeitsplatz, Handwerker- und Kundenportal.
 */
export function ApInfo({ text, label = 'Hinweis' }: { text: ReactNode; label?: string }) {
  const [offen, setOffen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!offen) return
    const zu = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOffen(false)
    }
    document.addEventListener('mousedown', zu)
    document.addEventListener('touchstart', zu)
    return () => {
      document.removeEventListener('mousedown', zu)
      document.removeEventListener('touchstart', zu)
    }
  }, [offen])

  return (
    <span className="ap-info" ref={ref}>
      <button type="button" className="ap-info__knopf" aria-label={label} aria-expanded={offen} onClick={() => setOffen((v) => !v)}>
        <MockIcon ctx="default" n="info-circle" size={16} />
      </button>
      {offen ? (
        <span className="ap-info__text" role="tooltip">
          {text}
        </span>
      ) : null}
    </span>
  )
}
