"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ClipboardCheck, type LucideIcon, QrCode, Search, Wrench } from "lucide-react";

type Schritt = {
  id: string;
  reiter: string;
  titel: string;
  text: string;
  /** Beispielkarte: eine Hauptaussage, eine kleine Zeile darunter */
  karte: { icon: LucideIcon; status: string; gross: string; klein: string };
};

/** Die fünf Schritte eines Vorgangs, je mit einer kleinen Beispiel-Oberfläche (nur Optik). */
const SCHRITTE: Schritt[] = [
  {
    id: "meldung",
    reiter: "Meldung",
    titel: "Gemeldet in einer Minute.",
    text: "Mieter, Hausmeister oder Sie melden per QR-Code im Haus, im Portal oder per Mail. Mit Foto und Wohnung.",
    karte: { icon: QrCode, status: "Neu", gross: "Heizung kalt", klein: "Leopoldstr. 10 · mit Foto" },
  },
  {
    id: "pruefung",
    reiter: "Prüfung",
    titel: "Geprüft, bevor jemand losfährt.",
    text: "Wir klären, was es ist und wie dringend. Bis zu Ihrer Wertgrenze geht es direkt los, darüber fragen wir Sie.",
    karte: { icon: Search, status: "Geprüft", gross: "Heute noch", klein: "Unter Ihrer Wertgrenze, direkt los" },
  },
  {
    id: "beauftragung",
    reiter: "Beauftragung",
    titel: "Der richtige Betrieb, der richtige Termin.",
    text: "Ein Partnerbetrieb bekommt den Auftrag. Den Termin stimmen wir mit dem Mieter ab.",
    karte: { icon: Wrench, status: "Beauftragt", gross: "Do, 9:00 Uhr", klein: "Heizungsbauer kommt, Mieter weiß Bescheid" },
  },
  {
    id: "ausfuehrung",
    reiter: "Ausführung",
    titel: "Erledigt und dokumentiert.",
    text: "Der Handwerker hält die Arbeit mit Fotos fest. Sie sehen den Stand, ohne anzurufen.",
    karte: { icon: Camera, status: "Erledigt", gross: "Repariert", klein: "3 Fotos vorher und nachher" },
  },
  {
    id: "abnahme",
    reiter: "Abnahme & Rechnung",
    titel: "Abgenommen und abgerechnet.",
    text: "Wir nehmen die Arbeit ab und stellen Ihnen eine Rechnung. Die Kosten sehen Sie im Budget des Hauses.",
    karte: { icon: ClipboardCheck, status: "Abgeschlossen", gross: "286,40 €", klein: "Eine Rechnung von teo" },
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
                  <span className="ts-schritte__status">{s.karte.status}</span>
                </div>
                <b className="ts-schritte__gross">{s.karte.gross}</b>
                <span className="ts-schritte__klein">{s.karte.klein}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
