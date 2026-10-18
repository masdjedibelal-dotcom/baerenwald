import type { ReactNode } from "react";

import { TeoRahmen } from "@/components/teo/TeoRahmen";

/** Impressum/Datenschutz/AGB im TEO-Rahmen (gleicher Inhalt wie Bärenwald, eigene Optik). */
export function TeoRechtsSeite({ titel, stand, children }: { titel: string; stand: string; children: ReactNode }) {
  return (
    <TeoRahmen>
      <div className="teo-innen teo-recht">
        <h1>{titel}</h1>
        <p className="teo-recht__stand">{stand}</p>
        <div className="teo-recht__text">{children}</div>
      </div>
    </TeoRahmen>
  );
}
