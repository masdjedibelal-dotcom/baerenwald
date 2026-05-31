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
        Neu: Im Chat beraten lassen — was du brauchst, welches Gewerk, und am Ende
        ein unverbindlicher Preisrahmen. Oder bewährt Schritt für Schritt.
      </p>

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
          Ob erste Idee oder konkretes Projekt: BärenwaldGPT erklärt dir
          Handwerks-Themen, sortiert dein Vorhaben — und berechnet danach einen
          Preisrahmen für München.
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
