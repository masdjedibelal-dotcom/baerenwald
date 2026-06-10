"use client";

import { PartnerComplianceCheckliste } from "@/components/partner/PartnerComplianceCheckliste";
import { PartnerDetailInfoBox } from "@/components/partner/PartnerDetailUi";
import type { PartnerComplianceItem } from "@/lib/partner/partner-compliance";

export function PartnerUnterlagenPanel({
  allgemein,
  meister,
  profil,
}: {
  allgemein: PartnerComplianceItem[];
  meister: PartnerComplianceItem[];
  profil?: { leistet_bauleistung?: boolean; hat_meister_gewerke?: boolean };
}) {
  return (
    <div className="space-y-6">
      <PartnerDetailInfoBox>
        Hier pflegst du deine Partnerunterlagen zentral: allgemeine Dokumente für alle
        Betriebe, bei Meister-Gewerken zusätzlich Fachbetriebsnachweise, und pro Auftrag die
        Leistungsunterlagen im jeweiligen Projektvertrag. Bei Ablauf siehst du einen Hinweis zum
        Neu-Upload.
      </PartnerDetailInfoBox>

      {profil ? (
        <p className="portal-text-meta text-text-secondary">
          {profil.leistet_bauleistung
            ? "Dein Profil enthält Bauleistungen — Bau-relevante Nachweise sind aktiv."
            : "Facility-/Dienstleistungsprofil — Bau-Paket (SoKA, §48b …) entfällt im Stamm."}
          {profil.hat_meister_gewerke ? " Meister-/Fachbetriebsnachweise sind aktiv." : ""}
        </p>
      ) : null}

      <PartnerComplianceCheckliste
        title="Allgemeine Partnerunterlagen"
        items={allgemein}
        emptyText="Keine allgemeinen Unterlagen für dein Profil."
      />

      {meister.length > 0 ? (
        <PartnerComplianceCheckliste
          title="Meister & Fachbetrieb"
          items={meister}
          emptyText="Keine Meister-Unterlagen für dein Profil."
        />
      ) : null}

      <p className="portal-text-meta text-text-secondary">
        Unterlagen je Leistungsvertrag findest du beim jeweiligen Angebot/Auftrag unter
        „Projektvertrag & Unterlagen“.
      </p>
    </div>
  );
}
