"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { PortalFunnelHost } from "@/components/funnel/PortalFunnelHost";
import {
  MieterWlCard,
  MieterWlFrame,
} from "@/components/melden/MieterWlFrame";
import type { MeldeLang } from "@/lib/melden/melde-i18n";
import type { MieterWlBrand } from "@/lib/portal2/mieter-wl";

type Props = {
  orgName: string;
  orgLogoUrl?: string | null;
  orgLogoKuerzel?: string | null;
  orgSub?: string | null;
  orgPrimaryColor?: string | null;
  orgPrimaryColorDk?: string | null;
  orgPrimaryColorSoft?: string | null;
  mieterKontaktTelefon?: string | null;
  mieterKontaktEmail?: string | null;
  mieterKontaktHinweis?: string | null;
  objektTitel: string;
  objektAdresse?: string;
  objektPlzOrt?: string;
  objektPlz?: string;
  einheitenHinweis?: string | null;
  orgKennung: string;
  objektSlug: string;
  datenschutzHref?: string;
  impressumHref?: string;
  mode?: "melden" | "ergaenzen";
  einladungToken?: string;
  prefill?: {
    name?: string;
    email?: string;
    telefon?: string;
    einheit?: string;
    beschreibung?: string;
  };
};

/**
 * Melde-Link / Ergänzen — Website-Funnel-Design (kaputt, kein Preis).
 */
export function MeldeFormular({
  orgName,
  orgLogoUrl,
  orgLogoKuerzel,
  orgSub,
  orgPrimaryColor,
  orgPrimaryColorDk,
  orgPrimaryColorSoft,
  mieterKontaktTelefon,
  mieterKontaktEmail,
  objektTitel,
  objektAdresse,
  objektPlzOrt,
  orgKennung,
  objektSlug,
  mode = "melden",
  einladungToken,
  prefill,
}: Props) {
  const router = useRouter();
  const [lang, setLang] = useState<MeldeLang>("de");

  const brand: MieterWlBrand = useMemo(
    () => ({
      name: orgName,
      sub: orgSub,
      logoUrl: orgLogoUrl,
      logoKuerzel: orgLogoKuerzel,
      primary: orgPrimaryColor,
      primaryDk: orgPrimaryColorDk,
      soft: orgPrimaryColorSoft,
      tel: mieterKontaktTelefon,
      mail: mieterKontaktEmail,
    }),
    [
      orgName,
      orgSub,
      orgLogoUrl,
      orgLogoKuerzel,
      orgPrimaryColor,
      orgPrimaryColorDk,
      orgPrimaryColorSoft,
      mieterKontaktTelefon,
      mieterKontaktEmail,
    ]
  );

  const sessionKey = `melde-${orgKennung}-${objektSlug}`;

  return (
    <MieterWlFrame brand={brand} lang={lang} onLangChange={setLang}>
      <MieterWlCard>
        <div className="mb-4 rounded-lg bg-[#f7f8fa] px-3 py-2.5 text-[13px]">
          <p className="font-semibold text-text-primary">{objektTitel}</p>
          {(objektAdresse || objektPlzOrt) && (
            <p className="text-text-secondary">
              {[objektAdresse, objektPlzOrt].filter(Boolean).join(" · ")}
            </p>
          )}
          <p className="mt-1 text-[12px] text-text-tertiary">
            {mode === "ergaenzen"
              ? `Ergänzung · ${orgName}`
              : `Meldung an ${orgName}`}
          </p>
        </div>
        <PortalFunnelHost
          channel="melde_anon"
          layout="page"
          title={mode === "ergaenzen" ? "Meldung ergänzen" : "Schaden melden"}
          prefill={prefill}
          melde={{
            orgKennung,
            objektSlug,
            orgName,
            sessionKey,
            ergaenzenToken:
              mode === "ergaenzen" ? einladungToken : undefined,
          }}
          onClose={() =>
            mode === "ergaenzen"
              ? router.push("/")
              : router.push(`/melden/${orgKennung}`)
          }
          onDone={() => undefined}
        />
      </MieterWlCard>
    </MieterWlFrame>
  );
}
