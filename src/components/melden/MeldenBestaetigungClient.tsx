"use client";

import Link from "next/link";

import {
  MieterWlBtn,
  MieterWlFrame,
} from "@/components/melden/MieterWlFrame";
import {
  MIETER_WL_BESTAETIGUNG,
  type MieterWlBrand,
} from "@/lib/portal2/mieter-wl";
import "./melden.css";

type Props = {
  brand: MieterWlBrand;
  statusToken?: string | null;
  referenz?: string | null;
  objektAuswahlHref?: string | null;
  /** Kontakt aus der Meldung */
  contactName?: string | null;
  contactEmail?: string | null;
  contactTelefon?: string | null;
  /** E-Mail hat bereits ein MeinBärenwald-Konto */
  portalAccountExists?: boolean;
};

/**
 * Bestätigung nach Meldung → CTA MeinBärenwald (Registrieren oder Login).
 */
export function MeldenBestaetigungClient({
  brand,
  statusToken,
  referenz,
  objektAuswahlHref,
  contactName,
  contactEmail,
  contactTelefon,
  portalAccountExists = false,
}: Props) {
  const t = MIETER_WL_BESTAETIGUNG;
  const ref =
    referenz?.trim() ||
    (statusToken ? statusToken.slice(0, 8).toUpperCase() : null);

  const registerHref = (() => {
    const q = new URLSearchParams();
    q.set("from", "melde");
    if (statusToken?.trim()) q.set("meldeToken", statusToken.trim());
    if (contactName?.trim()) q.set("name", contactName.trim());
    if (contactEmail?.trim()) q.set("email", contactEmail.trim());
    if (contactTelefon?.trim()) q.set("telefon", contactTelefon.trim());
    q.set("locked", "1");
    q.set("next", "/portal");
    return `/portal/registrieren?${q.toString()}`;
  })();

  const loginHref = (() => {
    const q = new URLSearchParams();
    q.set("next", "/portal");
    if (contactEmail?.trim()) q.set("email", contactEmail.trim());
    return `/portal/login?${q.toString()}`;
  })();

  return (
    <MieterWlFrame brand={brand}>
      <div className="mieter-wl-center">
        <div className="mieter-wl-check" aria-hidden>
          ✓
        </div>
        <h1 className="mieter-wl-center-title">{t.title_de}</h1>
        <p className="mieter-wl-center-body">
          {brand.name}
          {t.body_suffix_de}
        </p>

        {ref ? (
          <div className="mieter-wl-ref">
            <p className="mieter-wl-ref-label">{t.ref_de}</p>
            <p className="mieter-wl-ref-value">{ref}</p>
          </div>
        ) : null}

        <div className="w-full max-w-[340px] space-y-2.5 mt-2">
          {portalAccountExists ? (
            <>
              <p className="text-[13px] leading-relaxed text-[#4a5c54] text-center mb-1">
                {t.portal_existing_hint_de}
              </p>
              <MieterWlBtn href={loginHref}>{t.portal_login_cta_de}</MieterWlBtn>
            </>
          ) : (
            <>
              <p className="text-[13px] leading-relaxed text-[#4a5c54] text-center mb-1">
                {t.portal_register_hint_de}
              </p>
              <MieterWlBtn href={registerHref}>
                {t.portal_register_cta_de}
              </MieterWlBtn>
            </>
          )}

          {objektAuswahlHref ? (
            <Link
              href={objektAuswahlHref}
              className="block text-center text-sm font-semibold mt-2"
              style={{ color: "var(--org-primary, #2E7D52)" }}
            >
              Schließen
            </Link>
          ) : null}
        </div>
      </div>
    </MieterWlFrame>
  );
}
