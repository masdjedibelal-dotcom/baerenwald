import { MieterWlCard } from '@/components/melden/MieterWlFrame'
import { formatDatum } from '@/lib/shared-domain/geld-datum'
import type { ApDokument, ApMitteilung } from '@/teo/arbeitsplatz/daten/haus'
import type { MeinPlan } from '@/teo/mein/mein-daten'
import { Neuigkeiten } from '@/teo/mein/Neuigkeiten'

import '@/teo/mein/mein.css'

/** Liegt der geplante Termin schon zurück (Plan überfällig), zeigen Bewohner kein vergangenes Datum, sondern „demnächst“. */
function naechstesMal(naechste: string | null | undefined): string {
  if (!naechste) return 'demnächst'
  const heute = new Date().toISOString().slice(0, 10)
  return String(naechste).slice(0, 10) < heute ? 'demnächst' : formatDatum(naechste)
}

/** Für Bewohner: Neuigkeiten der Verwaltung, sichtbare Pläne (z. B. Treppenhaus), Dokumente. */
export function HausInfo({ mitteilungen, plaene, dokumente }: { mitteilungen: ApMitteilung[]; plaene: MeinPlan[]; dokumente: ApDokument[] }) {
  if (!mitteilungen.length && !plaene.length && !dokumente.length) return null
  return (
    <div className="mein-haus">
      {mitteilungen.length ? <Neuigkeiten mitteilungen={mitteilungen} /> : null}
      {plaene.length || dokumente.length ? (
        <MieterWlCard>
          <ul className="mein-zeilen mein-zeilen--innen">
            {plaene.map((p) => (
              <li key={p.id}>
                <span className="mein-zeilen__text">
                  <span className="mein-zeilen__titel block">{p.titel}</span>
                  <span className="mein-zeilen__meta block">
                    {p.zuletzt ? `Zuletzt ${formatDatum(p.zuletzt)}` : 'Noch nicht erledigt'} · Nächstes Mal {naechstesMal(p.naechste)}
                  </span>
                </span>
              </li>
            ))}
            {dokumente.map((d) => (
              <li key={d.id}>
                <a className="mein-zeilen__text" href={d.url} target="_blank" rel="noreferrer">
                  <span className="mein-zeilen__titel block">{d.name}</span>
                  <span className="mein-zeilen__meta block">Dokument öffnen</span>
                </a>
              </li>
            ))}
          </ul>
        </MieterWlCard>
      ) : null}
    </div>
  )
}
