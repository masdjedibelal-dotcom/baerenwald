"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, ClipboardCheck, type LucideIcon, QrCode, Search, Wrench } from "lucide-react";

type Zeile = { label: string; wert: string; ok?: boolean };
type Schritt = {
  id: string;
  reiter: string;
  titel: string;
  text: string;
  karte: { icon: LucideIcon; titel: string; status: string; zeilen: Zeile[]; budget?: boolean };
};

/** Die fünf Schritte eines Vorgangs, je mit einer kleinen Beispiel-Oberfläche (nur Optik). */
const SCHRITTE: Schritt[] = [
  {
    id: "meldung",
    reiter: "Meldung",
    titel: "Gemeldet in einer Minute.",
    text: "Mieter, Hausmeister oder Sie melden per QR-Code, App oder Mail. Mit Foto und Wohnung.",
    karte: {
      icon: QrCode,
      titel: "Neue Meldung",
      status: "Eingang",
      zeilen: [
        { label: "Haus", wert: "Leopoldstr. 10" },
        { label: "Wohnung", wert: "WE 4, 2. OG" },
        { label: "Was", wert: "Heizung kalt seit heute früh" },
        { label: "Fotos", wert: "2 angehängt", ok: true },
      ],
    },
  },
  {
    id: "pruefung",
    reiter: "Prüfung",
    titel: "Geprüft, bevor jemand losfährt.",
    text: "Wir klären, was es ist, wie dringend es ist und ob es unter Ihrer Wertgrenze liegt.",
    karte: {
      icon: Search,
      titel: "Heizung fällt aus",
      status: "Geprüft",
      zeilen: [
        { label: "Gewerk", wert: "Heizung", ok: true },
        { label: "Dringlichkeit", wert: "Heute", ok: true },
        { label: "Wertgrenze", wert: "Unter 500 €, direkt los", ok: true },
      ],
    },
  },
  {
    id: "beauftragung",
    reiter: "Beauftragung",
    titel: "Der richtige Betrieb, der richtige Termin.",
    text: "Ein Partnerbetrieb bekommt den Auftrag. Den Termin stimmen wir mit dem Mieter ab.",
    karte: {
      icon: Wrench,
      titel: "Auftrag vergeben",
      status: "Beauftragt",
      zeilen: [
        { label: "Betrieb", wert: "Partnerbetrieb Heizung", ok: true },
        { label: "Termin", wert: "Do, 9:00 Uhr", ok: true },
        { label: "Mieter", wert: "Informiert", ok: true },
      ],
    },
  },
  {
    id: "ausfuehrung",
    reiter: "Ausführung",
    titel: "Erledigt und dokumentiert.",
    text: "Der Handwerker hält die Arbeit mit Fotos fest. Sie sehen den Stand, ohne anzurufen.",
    karte: {
      icon: Camera,
      titel: "Arbeit erledigt",
      status: "Erledigt",
      zeilen: [
        { label: "Repariert", wert: "Thermostatventil getauscht", ok: true },
        { label: "Fotos", wert: "3 vorher und nachher", ok: true },
        { label: "Dauer", wert: "1,5 Stunden" },
      ],
    },
  },
  {
    id: "abnahme",
    reiter: "Abnahme & Rechnung",
    titel: "Geprüft, bevor es bei Ihnen landet.",
    text: "Wir prüfen Arbeit und Rechnung. Sie sehen die Kosten direkt im Budget des Hauses.",
    karte: {
      icon: ClipboardCheck,
      titel: "Rechnung geprüft",
      status: "Abgeschlossen",
      zeilen: [
        { label: "Rechnung", wert: "286,40 €", ok: true },
        { label: "Passt zum Auftrag", wert: "Ja", ok: true },
      ],
      budget: true,
    },
  },
];

const WECHSEL_MS = 5000;

/** Reiter-Fläche wie bei Lessen: jeder Schritt mit Satz und Beispiel-Oberfläche. Wechselt von selbst, bis jemand klickt. */
export function TeoSchritte() {
  const [aktiv, setAktiv] = useState(0);
  const [angehalten, setAngehalten] = useState(false);

  useEffect(() => {
    if (angehalten || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setAktiv((i) => (i + 1) % SCHRITTE.length), WECHSEL_MS);
    return () => window.clearInterval(t);
  }, [angehalten]);

  // Handy: aktiven Reiter in der seitlich scrollbaren Leiste sichtbar halten (nur waagerecht, Seite bleibt stehen)
  const leiste = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const l = leiste.current;
    const knopf = l?.children[aktiv] as HTMLElement | undefined;
    if (!l || !knopf || l.scrollWidth <= l.clientWidth) return;
    l.scrollTo({ left: knopf.offsetLeft - (l.clientWidth - knopf.offsetWidth) / 2, behavior: "smooth" });
  }, [aktiv]);

  return (
    <div className="ts-schritte">
      <div ref={leiste} className="ts-schritte__reiter" role="tablist" aria-label="Schritte eines Auftrags">
        {SCHRITTE.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            id={`schritt-${s.id}`}
            aria-selected={i === aktiv}
            aria-controls={`schritt-${s.id}-inhalt`}
            className={i === aktiv ? "ist-aktiv" : undefined}
            onClick={() => {
              setAktiv(i);
              setAngehalten(true);
            }}
          >
            <span className="ts-schritte__nr">{i + 1}</span>
            {s.reiter}
          </button>
        ))}
      </div>
      <div className="ts-schritte__buehne">
        {SCHRITTE.map((s, i) => {
          const K = s.karte.icon;
          return (
            <div
              key={s.id}
              role="tabpanel"
              id={`schritt-${s.id}-inhalt`}
              aria-labelledby={`schritt-${s.id}`}
              className={`ts-schritte__inhalt ${i === aktiv ? "ist-aktiv" : ""}`}
              aria-hidden={i !== aktiv}
            >
              <div className="ts-schritte__text">
                <h3>{s.titel}</h3>
                <p>{s.text}</p>
              </div>
              <div className="ts-schritte__karte" aria-hidden="true">
                <div className="ts-schritte__kopf">
                  <span className="ts-schritte__icon">
                    <K size={18} />
                  </span>
                  <span className="ts-schritte__kopftext">
                    <b>{s.karte.titel}</b>
                    <small>Leopoldstr. 10 · WE 4</small>
                  </span>
                  <span className="ts-schritte__status">{s.karte.status}</span>
                </div>
                <dl>
                  {s.karte.zeilen.map((z) => (
                    <div key={z.label}>
                      <dt>{z.label}</dt>
                      <dd>
                        {z.ok ? (
                          <span className="ts-schritte__ok">
                            <Check size={12} strokeWidth={3} />
                          </span>
                        ) : null}
                        {z.wert}
                      </dd>
                    </div>
                  ))}
                </dl>
                {s.karte.budget ? (
                  <div className="ts-schritte__budget">
                    <span>
                      Budget Leopoldstr. 10 <b>3.240 € von 8.000 €</b>
                    </span>
                    <span className="ts-schritte__balken">
                      <span />
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
