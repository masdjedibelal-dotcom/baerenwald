"use client";

import { PartnerComplianceCheckliste } from "@/components/partner/PartnerComplianceCheckliste";
import { PartnerDetailInfoBox } from "@/components/partner/PartnerDetailUi";
import { PartnerRahmenvertragCard } from "@/components/partner/PartnerRahmenvertragCard";
import { PartnerStammdatenForm } from "@/components/partner/PartnerStammdatenForm";
import type { PartnerProfilKontext, PartnerHandwerkerProfil } from "@/lib/partner/get-partner-data";

function profilBadgeLabel(profil: PartnerProfilKontext["profil"]): string {
  if (profil.leistet_bauleistung && profil.hat_meister_gewerke) {
    return "Bau · Meisterbetrieb";
  }
  if (profil.leistet_bauleistung) return "Bauleistungen";
  if (profil.hat_meister_gewerke) return "Meister / Fachbetrieb";
  return "Facility / Dienstleistung";
}

export function PartnerProfilPanel({
  handwerker,
  profil,
}: {
  handwerker: PartnerHandwerkerProfil;
  profil: PartnerProfilKontext;
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="portal-text-section text-text-primary">Profil & Unterlagen</h2>
            <p className="portal-text-body mt-0.5 text-text-secondary">
              Stammdaten, Partnerunterlagen und Rahmenvertrag an einem Ort.
            </p>
          </div>
          <span className="tag bg-accent-light text-accent">{profilBadgeLabel(profil.profil)}</span>
        </div>
      </div>

      <PartnerStammdatenForm handwerker={handwerker} />

      <PartnerRahmenvertragCard
        rahmenvertrag={profil.rahmenvertrag}
        stammItems={profil.stamm}
      />

      <section className="space-y-4">
        <PartnerDetailInfoBox>
          Hier pflegst du deine Unterlagen und bei Meister-Gewerken zusätzlich Fachbetriebsnachweise.
          Leistungsunterlagen je Auftrag findest du unter dem jeweiligen Projektvertrag.
        </PartnerDetailInfoBox>

        <PartnerComplianceCheckliste
          title="Unterlagen"
          items={[...profil.allgemein, ...profil.meister]}
          gruppiert
          emptyText="Keine Unterlagen für dein Profil."
        />
      </section>
    </div>
  );
}
