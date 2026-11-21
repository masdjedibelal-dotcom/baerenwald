"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Servus TEO: Kontomenü wie im Arbeitsplatz — runde Plakette oben rechts, Antippen öffnet ein Popover
 * mit Name, (optional) Einstellungen und Abmelden. Einheitlich für Handwerker, Kunden, Team und MeinTEO.
 */
export function TeoKontoMenue({
  kuerzel,
  name,
  unterzeile,
  onEinstellungen,
  abmeldenAction,
}: {
  kuerzel: string;
  name: string;
  unterzeile?: string | null;
  onEinstellungen?: () => void;
  /** POST-Ziel zum Abmelden, z. B. /portal/auth/signout */
  abmeldenAction: string;
}) {
  const [offen, setOffen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!offen) return;
    const zu = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOffen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOffen(false);
    document.addEventListener("mousedown", zu);
    document.addEventListener("touchstart", zu);
    window.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", zu);
      document.removeEventListener("touchstart", zu);
      window.removeEventListener("keydown", esc);
    };
  }, [offen]);

  return (
    <div className="teo-konto" ref={ref}>
      <button
        type="button"
        className="teo-konto__plakette"
        aria-label="Konto"
        aria-haspopup="menu"
        aria-expanded={offen}
        onClick={() => setOffen((v) => !v)}
      >
        {kuerzel}
      </button>
      {offen ? (
        <div className="teo-konto__menue" role="menu">
          <div className="teo-konto__kopf">
            <span className="teo-konto__plakette teo-konto__plakette--klein" aria-hidden>
              {kuerzel}
            </span>
            <span className="teo-konto__text">
              <span className="teo-konto__name">{name}</span>
              {unterzeile ? <span className="teo-konto__unter">{unterzeile}</span> : null}
            </span>
          </div>
          {onEinstellungen ? (
            <button
              type="button"
              role="menuitem"
              className="teo-konto__punkt"
              onClick={() => {
                setOffen(false);
                onEinstellungen();
              }}
            >
              Einstellungen
            </button>
          ) : null}
          <form action={abmeldenAction} method="post">
            <button type="submit" role="menuitem" className="teo-konto__punkt teo-konto__punkt--rot">
              Abmelden
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export function teoKuerzel(name: string | null | undefined, fallback = "T"): string {
  return (
    (name ?? "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => t[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || fallback
  );
}
