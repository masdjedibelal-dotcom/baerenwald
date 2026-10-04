"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { PartnerEinsaetzeSection } from "@/components/partner/PartnerEinsaetzeSection";
import { PartnerHwDashboard } from "@/components/partner/PartnerHwDashboard";
import { PartnerNotificationBell } from "@/components/partner/PartnerNotificationBell";
import { PartnerProfilPanel } from "@/components/partner/PartnerProfilPanel";
import { PortalButton } from "@/components/portal/PortalButton";
import { PortalLegalFooter } from "@/components/shared/PortalLegalFooter";
import { PortalShell } from "@/components/shared/PortalShell";
import type { PartnerHandwerkerProfil, PartnerProfilKontext } from "@/lib/partner/get-partner-data";
import { buildPortalShellNav } from "@/lib/portal2/nav-items";
import { portalHeaderHeroSrc } from "@/lib/portal2/portal-media";

/**
 * Partner-Portal (04.10.2026): nur noch Einsätze (Übersicht) und Einstellungen (Firmendaten,
 * Handwerkskarte, Rahmenvertrag). Der alte Weg über Anfragen/Angebote/Positionen ist entfernt.
 */
type PartnerSection = "uebersicht" | "profil";

function sectionAusUrl(raw: string | null): PartnerSection {
  return raw === "profil" || raw === "unterlagen" ? "profil" : "uebersicht";
}

export function PartnerClient({
  handwerker,
  profil,
}: {
  handwerker: PartnerHandwerkerProfil;
  profil: PartnerProfilKontext;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [section, setSection] = useState<PartnerSection>(() => sectionAusUrl(searchParams.get("section")));

  useEffect(() => {
    setSection(sectionAusUrl(searchParams.get("section")));
  }, [searchParams]);

  function switchSection(id: PartnerSection) {
    setSection(id);
    router.replace(id === "profil" ? "/partner?section=profil" : "/partner", { scroll: false });
  }

  const firma = handwerker.firma?.trim() || handwerker.name?.trim() || "Partner-Betrieb";

  return (
    <PortalShell
      variant="partner"
      brandTitle="MeinBärenwald"
      brandSubtitle="Partner-Portal"
      // Kürzel des Betriebs (der Name steht daneben) statt „B“ für Bärenwald
      brandKuerzel={firma.charAt(0).toUpperCase() || "B"}
      sidebarOwner={firma}
      contentFullBleed={section === "uebersicht"}
      topbarTransparent={section === "uebersicht"}
      activeNavId={section}
      contentKey={section}
      onNavChange={(id) => switchSection(id === "profil" ? "profil" : "uebersicht")}
      nav={buildPortalShellNav("handwerker", "partner")}
      footer={firma}
      notifications={<PartnerNotificationBell onOpenVorgang={() => switchSection("uebersicht")} />}
      headerRoleBadge={
        <form action="/partner/auth/signout" method="post">
          <PortalButton variant="secondary" action={false} compact type="submit" className="btn-pill-outline">
            Abmelden
          </PortalButton>
        </form>
      }
    >
      <div className="flex min-h-full flex-1 flex-col gap-5">
        {section === "profil" ? <PartnerProfilPanel handwerker={handwerker} profil={profil} /> : null}

        {section === "uebersicht" ? (
          <PartnerHwDashboard
            firmName={firma}
            heroImageUrl={portalHeaderHeroSrc("handwerker")}
            nurEinsaetze
            beforeTiles={<PartnerEinsaetzeSection />}
            kpis={{ offen: 0, inAusfuehrung: 0, erledigt: 0 }}
            recent={[]}
            onOpenAll={() => switchSection("uebersicht")}
            onOpenItem={() => switchSection("uebersicht")}
          />
        ) : null}

        <PortalLegalFooter variant="partner" className="mx-auto max-w-[1200px] px-1 lg:px-0" />
      </div>
    </PortalShell>
  );
}
