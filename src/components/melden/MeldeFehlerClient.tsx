"use client";

import { useState } from "react";

import {
  MieterWlBtn,
  MieterWlFrame,
} from "@/components/melden/MieterWlFrame";
import type { MeldeLang } from "@/lib/melden/melde-i18n";
import {
  MIETER_WL_FEHLER,
  type MieterWlBrand,
} from "@/lib/portal2/mieter-wl";
import "./melden.css";

const DEFAULT_BRAND: MieterWlBrand = {
  name: "Hausverwaltung",
  sub: "Melde-Link",
};

/**
 * Mock `wlFehler` — exakter Wortlaut de+en.
 */
export function MeldeFehlerClient({
  brand,
  objektAuswahlHref,
}: {
  brand?: MieterWlBrand | null;
  objektAuswahlHref?: string | null;
}) {
  const [lang, setLang] = useState<MeldeLang>("de");
  const b = brand ?? DEFAULT_BRAND;

  return (
    <MieterWlFrame brand={b} lang={lang} onLangChange={setLang} compact>
      <div className="mieter-wl-center">
        <div className="mieter-wl-alert" aria-hidden>
          !
        </div>
        <h1 className="mieter-wl-center-title">
          {lang === "en"
            ? MIETER_WL_FEHLER.title_en
            : MIETER_WL_FEHLER.title_de}
        </h1>
        <p className="mieter-wl-center-body">
          {lang === "en" ? MIETER_WL_FEHLER.body_en : MIETER_WL_FEHLER.body_de}
        </p>
        <div className="w-full max-w-[320px]">
          <MieterWlBtn
            kind="ghost"
            href={objektAuswahlHref || "/"}
          >
            {lang === "en" ? MIETER_WL_FEHLER.btn_en : MIETER_WL_FEHLER.btn_de}
          </MieterWlBtn>
        </div>
      </div>
    </MieterWlFrame>
  );
}
