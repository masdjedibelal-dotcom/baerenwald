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
        Was möchtest du machen? Im Chat beraten lassen — oder bewährt Schritt für
        Schritt bis zum unverbindlichen Preisrahmen.
      </p>

      <ul className="ki-rechner-starter-trust" aria-label="Vorteile">
        <li>Kostenlos</li>
        <li>Unverbindlich</li>
        <li>München &amp; Umgebung</li>
      </ul>

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
          Beraten, Räume visualisieren und dein Projekt direkt im Chat anfragen —
          mit dem gleichen BärenwaldGPT wie im Kundenportal.
        </span>
      </button>

      <button
        type="button"
        aria-pressed={selected === "funnel"}
        className={cn(
          "ki-rechner-starter-card ki-rechner-starter-card--funnel",
          selected === "funnel" && "selected"
        )}
        onClick={() => onSelect("funnel")}
      >
        <span className="ki-rechner-starter-card-title">Option für Option</span>
        <span className="ki-rechner-starter-card-hint">
          Situation, Gewerk, Größe, PLZ — Schritt für Schritt, wie du es kennst.
        </span>
      </button>
    </div>
  );
}
