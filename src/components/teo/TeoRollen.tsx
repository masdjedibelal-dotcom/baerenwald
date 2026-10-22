"use client";

import { useState } from "react";

import { HandyMieter, HandyTeamApp, RolleEigentuemer, RolleVerwaltung } from "@/components/teo/TeoVisuals";

const ROLLEN = [
  {
    id: "verwaltung",
    label: "Verwaltung",
    titel: "Alle Häuser auf einer Seite.",
    punkte: ["Freigeben mit einem Klick, Budget daneben."],
    visual: "verwaltung",
  },
  {
    id: "hausmeister",
    label: "Hausmeister",
    titel: "Rundgang auf dem Handy.",
    punkte: ["Was nicht passt, ist sofort ein Vorgang."],
    visual: "hausmeister",
  },
  {
    id: "mieter",
    label: "Mieter",
    titel: "QR-Code scannen, fertig.",
    punkte: ["Melden ohne Konto und ohne Anruf."],
    visual: "mieter",
  },
  {
    id: "eigentuemer",
    label: "Eigentümer",
    titel: "Wissen, was im Haus passiert.",
    punkte: ["In der WEG mit Kosten und Beschlüssen."],
    visual: "eigentuemer",
  },
] as const;

export function TeoRollen() {
  const [aktiv, setAktiv] = useState<(typeof ROLLEN)[number]["id"]>("verwaltung");
  const r = ROLLEN.find((x) => x.id === aktiv) ?? ROLLEN[0];
  return (
    <div className="ts-rollen">
      <div className="ts-rollen__reiter" role="tablist" aria-label="Rollen">
        {ROLLEN.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={x.id === aktiv}
            className={x.id === aktiv ? "ist-aktiv" : undefined}
            onClick={() => setAktiv(x.id)}
          >
            {x.label}
          </button>
        ))}
      </div>
      <div className={`ts-rollen__buehne ts-rollen__buehne--${r.id}`} role="tabpanel">
        <div className="ts-rollen__text">
          <h3>{r.titel}</h3>
          <ul>
            {r.punkte.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
        <div className="ts-rollen__visual">
          {r.visual === "verwaltung" ? <RolleVerwaltung /> : null}
          {r.visual === "hausmeister" ? (
            <div className="ts-handy">
              <HandyTeamApp />
            </div>
          ) : null}
          {r.visual === "mieter" ? (
            <div className="ts-handy">
              <HandyMieter />
            </div>
          ) : null}
          {r.visual === "eigentuemer" ? <RolleEigentuemer /> : null}
        </div>
      </div>
    </div>
  );
}
