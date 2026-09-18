"use client";

import {
  MieterWlBtn,
  MieterWlFrame,
} from "@/components/melden/MieterWlFrame";
import {
  formatMieterWlFooterContact,
  MIETER_WL_FEHLER,
  type MieterWlBrand,
} from "@/lib/portal2/mieter-wl";
import "./melden.css";

const DEFAULT_BRAND: MieterWlBrand = {
  name: "Verwaltung",
  sub: "Melde-Link",
};

const NEUTRAL_BRAND: MieterWlBrand = {
  name: "Status",
  sub: null,
};

/**
 * Melde-Fehlerseite (nur Deutsch).
 * Optional: eigene Titel/Body (z. B. Soft-Delete Status-Token).
 */
export function MeldeFehlerClient({
  brand,
  objektAuswahlHref,
  title,
  body,
  showOrgContact = false,
  showObjektButton = true,
  neutral = false,
}: {
  brand?: MieterWlBrand | null;
  objektAuswahlHref?: string | null;
  title?: string | null;
  body?: string | null;
  /** Org-Telefon/Mail unter dem Text anzeigen */
  showOrgContact?: boolean;
  showObjektButton?: boolean;
  /** Kein Org-Branding (Hard-Delete / unbekannt) */
  neutral?: boolean;
}) {
  const b = neutral ? NEUTRAL_BRAND : brand ?? DEFAULT_BRAND;
  const heading = title?.trim() || MIETER_WL_FEHLER.title_de;
  const text = body?.trim() || MIETER_WL_FEHLER.body_de;
  const contact =
    showOrgContact && !neutral && (b.tel?.trim() || b.mail?.trim())
      ? formatMieterWlFooterContact(b, "de")
      : null;

  return (
    <MieterWlFrame brand={b} compact hideFooter={neutral}>
      <div className="mieter-wl-center">
        <div className="mieter-wl-alert" aria-hidden>
          !
        </div>
        <h1 className="mieter-wl-center-title">{heading}</h1>
        <p className="mieter-wl-center-body">{text}</p>
        {contact ? (
          <p className="mieter-wl-center-body mt-2 text-[13px] text-[#4a5c54]">
            {contact}
          </p>
        ) : null}
        {showObjektButton && !neutral ? (
          <div className="w-full max-w-[320px]">
            <MieterWlBtn kind="ghost" href={objektAuswahlHref || "/"}>
              {MIETER_WL_FEHLER.btn_de}
            </MieterWlBtn>
          </div>
        ) : null}
      </div>
    </MieterWlFrame>
  );
}
