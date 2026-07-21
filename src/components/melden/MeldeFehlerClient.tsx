"use client";

import {
  MieterWlBtn,
  MieterWlFrame,
} from "@/components/melden/MieterWlFrame";
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
 * Melde-Fehlerseite (nur Deutsch).
 */
export function MeldeFehlerClient({
  brand,
  objektAuswahlHref,
}: {
  brand?: MieterWlBrand | null;
  objektAuswahlHref?: string | null;
}) {
  const b = brand ?? DEFAULT_BRAND;

  return (
    <MieterWlFrame brand={b} compact>
      <div className="mieter-wl-center">
        <div className="mieter-wl-alert" aria-hidden>
          !
        </div>
        <h1 className="mieter-wl-center-title">{MIETER_WL_FEHLER.title_de}</h1>
        <p className="mieter-wl-center-body">{MIETER_WL_FEHLER.body_de}</p>
        <div className="w-full max-w-[320px]">
          <MieterWlBtn kind="ghost" href={objektAuswahlHref || "/"}>
            {MIETER_WL_FEHLER.btn_de}
          </MieterWlBtn>
        </div>
      </div>
    </MieterWlFrame>
  );
}
