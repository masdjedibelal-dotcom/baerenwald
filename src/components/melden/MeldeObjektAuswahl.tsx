"use client";

import Link from "next/link";
import { useState } from "react";

import {
  MieterWlFrame,
} from "@/components/melden/MieterWlFrame";
import type { MeldeLang } from "@/lib/melden/melde-i18n";
import {
  MIETER_WL_OBJEKT,
  type MieterWlBrand,
} from "@/lib/portal2/mieter-wl";
import "./melden.css";

export type MeldeObjektChoice = {
  id: string;
  name: string;
  adr: string;
  we?: string | null;
  href: string;
};

/**
 * Mock `wlObjekt` — Gebäudewahl im HV-Branding.
 */
export function MeldeObjektAuswahl({
  brand,
  objekte,
}: {
  brand: MieterWlBrand;
  objekte: MeldeObjektChoice[];
}) {
  const [lang, setLang] = useState<MeldeLang>("de");

  return (
    <MieterWlFrame brand={brand} lang={lang} onLangChange={setLang}>
      <div>
        <h1 className="mieter-wl-objekt-title">
          {lang === "en" ? MIETER_WL_OBJEKT.title_en : MIETER_WL_OBJEKT.title_de}
        </h1>
        <p className="mieter-wl-objekt-sub">
          {lang === "en" ? MIETER_WL_OBJEKT.sub_en : MIETER_WL_OBJEKT.sub_de}
        </p>
        <div className="mieter-wl-objekt-list">
          {objekte.map((o) => (
            <Link key={o.id} href={o.href} className="mieter-wl-objekt-item">
              <span className="mieter-wl-objekt-icon" aria-hidden>
                ▦
              </span>
              <span className="min-w-0 flex-1">
                <span className="mieter-wl-objekt-item-title block">{o.name}</span>
                <span className="mieter-wl-objekt-item-meta block">
                  {[o.adr, o.we].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span className="text-[#8a9690] text-lg" aria-hidden>
                ›
              </span>
            </Link>
          ))}
        </div>
      </div>
    </MieterWlFrame>
  );
}
