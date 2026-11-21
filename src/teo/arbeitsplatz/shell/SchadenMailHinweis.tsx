'use client'

import { useState } from 'react'

import { MockIcon } from '@/teo/arbeitsplatz/kit'

/** Hinweis-Box: Schäden direkt per E-Mail melden — Adresse, daneben Kopieren und E-Mail schreiben. */
export function SchadenMailHinweis({ adresse }: { adresse: string }) {
  const [kopiert, setKopiert] = useState(false)
  function kopieren() {
    navigator.clipboard.writeText(adresse).then(
      () => {
        setKopiert(true)
        window.setTimeout(() => setKopiert(false), 1800)
      },
      () => setKopiert(false)
    )
  }
  return (
    <div className="ap-schadenmail">
      <span className="ap-schadenmail__icon" aria-hidden>
        <MockIcon ctx="default" n="mail" size={20} />
      </span>
      <div className="ap-schadenmail__text">
        <span className="ap-schadenmail__titel">Per E-Mail melden</span>
        <span className="ap-schadenmail__adresse">{kopiert ? 'Adresse kopiert' : adresse}</span>
      </div>
      <button type="button" className="ap-schadenmail__knopf" onClick={kopieren} aria-label="Adresse kopieren" title="Adresse kopieren">
        <MockIcon ctx="default" n={kopiert ? 'check' : 'copy'} size={18} />
      </button>
      <a className="ap-schadenmail__knopf" href={`mailto:${adresse}?subject=${encodeURIComponent('Schaden')}`} aria-label="E-Mail schreiben" title="E-Mail schreiben">
        <MockIcon ctx="default" n="send" size={18} />
      </a>
    </div>
  )
}
