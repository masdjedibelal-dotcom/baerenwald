"use client";

import { cn } from "@/lib/utils";

export type EinstiegWahl = "ki" | "funnel";

export type KiRechnerStarterProps = {
  selected: EinstiegWahl | null;
  onSelect: (value: EinstiegWahl) => void;
};

export function KiRechnerStarter({ selected, onSelect }: KiRechnerStarterProps) {
  return (
    <div className="ki-rechner-starter">
      <p className="ki-rechner-starter-eyebrow">Dein Vorhaben</p>
      <h2 className="ki-rechner-starter-h2">Wie willst du starten?</h2>
      <p className="ki-rechner-starter-sub">
        Nur den Preisrahmen — oder Beratung, Visualisierung und Anfrage? Wähle,
        was zu dir passt.
      </p>

      <ul className="ki-rechner-starter-trust" aria-label="Vorteile">
        <li>Kostenlos</li>
        <li>Unverbindlich</li>
        <li>München &amp; Umgebung</li>
      </ul>

      <button
        type="button"
        aria-pressed={selected === "funnel"}
        className={cn(
          "ki-rechner-starter-card ki-rechner-starter-card--funnel",
          selected === "funnel" && "selected"
        )}
        onClick={() => onSelect("funnel")}
      >
        <span className="ki-rechner-starter-card-title">Preisrahmen ermitteln</span>
        <span className="ki-rechner-starter-card-hint">
          Situation, Gewerk, Größe, PLZ — Schritt für Schritt, der schnellste Weg,
          wenn dir nur der Preis wichtig ist.
        </span>
      </button>

      <button
        type="button"
        aria-pressed={selected === "ki"}
        className={cn(
          "ki-rechner-starter-card ki-rechner-starter-card--ki",
          selected === "ki" && "selected"
        )}
        onClick={() => onSelect("ki")}
      >
        <span
          className="ki-rechner-starter-stoerer ki-rechner-mode-label"
          aria-hidden
        >
          BärenwaldGPT
        </span>
        <span className="ki-rechner-starter-card-title">Frag einfach los</span>
        <span className="ki-rechner-starter-card-hint">
          Beraten, Räume visualisieren, Preis besprechen oder Anfrage senden —
          wenn du mehr willst als nur eine Zahl.
        </span>
      </button>
    </div>
  );
}
