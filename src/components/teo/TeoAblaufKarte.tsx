"use client";

import { useEffect, useState } from "react";
import { Check, Droplets, Flame, type LucideIcon, Zap } from "lucide-react";

type Fall = { icon: LucideIcon; nr: string; titel: string; ort: string; schritte: string[] };

/** Beispiel-Vorgänge für die Hero-Karte: so läuft ein Fall bei teo durch (nur Optik). */
const FAELLE: Fall[] = [
  { icon: Flame, nr: "1042", titel: "Heizung fällt aus", ort: "Leopoldstr. 10", schritte: ["Gemeldet mit Foto", "Heizungsbauer beauftragt", "Repariert", "Abgenommen"] },
  { icon: Droplets, nr: "1043", titel: "Wasser im Keller", ort: "Hohenzollernstr. 31", schritte: ["Gemeldet mit Foto", "Notdienst beauftragt", "Leck abgedichtet", "Abgenommen"] },
  { icon: Zap, nr: "1044", titel: "Klingel defekt", ort: "Belgradstr. 5", schritte: ["Gemeldet online", "Elektriker beauftragt", "Repariert", "Abgenommen"] },
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
          <small>{fall.ort}</small>
        </span>
        <span className={`ts-ablauf-karte__status ${fertig ? "ist-fertig" : ""}`}>{fertig ? "Erledigt" : "Bei teo"}</span>
      </div>
      <ol className="ts-ablauf-karte__schritte">
        {fall.schritte.map((text, i) => {
          const zustand = i < stand - 1 || fertig ? "fertig" : i === stand - 1 ? "aktiv" : "offen";
          return (
            <li key={`${fall.nr}-${i}`} className={`ist-${zustand}`}>
              <span className="ts-ablauf-karte__punkt">{zustand === "fertig" ? <Check size={12} strokeWidth={3} /> : null}</span>
              <span className="ts-ablauf-karte__text">{text}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
