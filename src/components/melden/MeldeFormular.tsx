"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import { PortalFunnelHost } from "@/components/funnel/PortalFunnelHost";
import { MieterWlFrame } from "@/components/melden/MieterWlFrame";
import { MELDE_ALLGEMEIN_SLUG } from "@/lib/org/melde-url";
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
  /**
   * Objekt-Link/Aushang: Objekt ist fest — kein Sprung zur HV-Objektliste.
   */
  objektLocked?: boolean;
  prefill?: {
    name?: string;
    email?: string;
    telefon?: string;
    einheit?: string;
    beschreibung?: string;
  };
};

/**
 * Melde-Link / Ergänzen — Website-Funnel-Chrome + HV-Branding.
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
  objektLocked = false,
  prefill,
}: Props) {
  const router = useRouter();

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
  const isAllgemein =
    !objektLocked &&
    objektSlug.trim().toLowerCase() === MELDE_ALLGEMEIN_SLUG;

  return (
    <MieterWlFrame brand={brand} variant="funnel" hideFooter>
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
          ergaenzenToken: mode === "ergaenzen" ? einladungToken : undefined,
          needsAddress: isAllgemein,
          objektLocked,
          objektTitel: isAllgemein ? null : objektTitel,
          objektAdresse: isAllgemein
            ? null
            : [objektAdresse, objektPlzOrt].filter(Boolean).join(" · ") || null,
        }}
        onClose={() => {
          if (mode === "ergaenzen") {
            router.push("/");
            return;
          }
          // Objekt-Link: nicht zur HV-Objektliste (andere Gebäude) springen
          if (objektLocked) return;
          router.push(`/melden/${orgKennung}`);
        }}
        onDone={() => undefined}
      />
    </MieterWlFrame>
  );
}
