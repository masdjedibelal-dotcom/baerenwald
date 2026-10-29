"use client";

import { useEffect, useState } from "react";
import { Check, Droplets, Flame, type LucideIcon, Zap } from "lucide-react";

type Fall = { icon: LucideIcon; nr: string; titel: string; ort: string; schritte: [string, string][] };

/** Beispiel-Vorgänge für die Hero-Karte: so läuft ein Fall bei teo durch (nur Optik). */
const FAELLE: Fall[] = [
  {
    icon: Flame,
    nr: "1042",
    titel: "Heizung fällt aus",
    ort: "Leopoldstr. 10 · WE 4",
    schritte: [
      ["Gemeldet per QR-Code, mit Foto", "07:12"],
      ["Geprüft und Gewerk zugeordnet", "07:18"],
      ["Heizungsbauer beauftragt", "07:31"],
      ["Termin mit Mieter abgestimmt", "08:05"],
      ["Repariert, 3 Fotos", "11:40"],
      ["Abgenommen, Rechnung von teo", "14:10"],
    ],
  },
  {
    icon: Droplets,
    nr: "1043",
    titel: "Wasser im Keller",
    ort: "Hohenzollernstr. 31",
    schritte: [
      ["Hausmeister meldet mit Foto", "06:48"],
      ["Notdienst beauftragt", "06:55"],
      ["Leck abgedichtet", "08:20"],
      ["Trocknung geplant", "09:10"],
      ["Abgenommen mit Fotos", "Fr 10:00"],
      ["Rechnung von teo", "Fr 12:30"],
    ],
  },
  {
    icon: Zap,
    nr: "1044",
    titel: "Klingel defekt",
    ort: "Belgradstr. 5",
    schritte: [
      ["Mieterin meldet online", "18:02"],
      ["Unter Ihrer Wertgrenze, direkt los", "18:03"],
      ["Elektriker beauftragt", "Mo 08:10"],
      ["Termin abgestimmt", "Mo 08:40"],
      ["Repariert", "Di 10:15"],
      ["Abgenommen, Rechnung von teo", "Di 16:00"],
    ],
  },
];

const TAKT_MS = 1100;
const PAUSE_SCHRITTE = 4;

/** Hero-Karte im Stil eines Vorgangs: Schritte erscheinen nacheinander, dann der nächste Fall. */
export function TeoAblaufKarte() {
  const [{ fallIndex, stand }, setZustand] = useState({ fallIndex: 0, stand: 1 });

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setZustand({ fallIndex: 0, stand: FAELLE[0]!.schritte.length });
      return;
    }
    const t = window.setInterval(() => {
      setZustand((z) =>
        z.stand < FAELLE[z.fallIndex]!.schritte.length + PAUSE_SCHRITTE
          ? { ...z, stand: z.stand + 1 }
          : { fallIndex: (z.fallIndex + 1) % FAELLE.length, stand: 1 }
      );
    }, TAKT_MS);
    return () => window.clearInterval(t);
  }, []);

  const fall = FAELLE[fallIndex]!;
  const fertig = stand >= fall.schritte.length;
  const Icon = fall.icon;

  return (
    <div className="ts-ablauf-karte" aria-hidden="true">
      <div className="ts-ablauf-karte__kopf" key={fall.nr}>
        <span className="ts-ablauf-karte__icon">
          <Icon size={20} />
        </span>
        <span className="ts-ablauf-karte__titel">
          <b>{fall.titel}</b>
          <small>
            #{fall.nr} · {fall.ort}
          </small>
        </span>
        <span className={`ts-ablauf-karte__status ${fertig ? "ist-fertig" : ""}`}>{fertig ? "Erledigt" : "Bei teo"}</span>
      </div>
      <ol className="ts-ablauf-karte__schritte">
        {fall.schritte.map(([text, zeit], i) => {
          const zustand = i < stand - 1 || fertig ? "fertig" : i === stand - 1 ? "aktiv" : "offen";
          return (
            <li key={`${fall.nr}-${i}`} className={`ist-${zustand}`}>
              <span className="ts-ablauf-karte__punkt">{zustand === "fertig" ? <Check size={12} strokeWidth={3} /> : null}</span>
              <span className="ts-ablauf-karte__text">{text}</span>
              <span className="ts-ablauf-karte__zeit">{zeit}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
