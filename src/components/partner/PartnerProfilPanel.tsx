"use client";

import { PartnerDetailInfoBox } from "@/components/partner/PartnerDetailUi";
import { PartnerRahmenvertragCard } from "@/components/partner/PartnerRahmenvertragCard";
import { PartnerStammdatenForm } from "@/components/partner/PartnerStammdatenForm";
import type { PartnerProfilKontext, PartnerHandwerkerProfil } from "@/lib/partner/get-partner-data";
import { filterProfilStammCompliance } from "@/lib/partner/compliance-summary";

export function PartnerProfilPanel({
  handwerker,
  profil,
}: {
  handwerker: PartnerHandwerkerProfil;
  profil: PartnerProfilKontext;
}) {
  const handwerkskarte = filterProfilStammCompliance([
    ...profil.allgemein,
    ...profil.meister,
  ]);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div>
          <h2 className="portal-text-section text-text-primary">Profil & Unterlagen</h2>
          <p className="portal-text-body mt-0.5 text-text-secondary">
            Stammdaten, Rahmenvertrag und Handwerkskarte — Unterlagen je Bauauftrag findest du
            unter Angebote und Aufträge.
          </p>
        </div>
      </div>

      <PartnerStammdatenForm handwerker={handwerker} />

      <PartnerRahmenvertragCard
        rahmenvertrag={profil.rahmenvertrag}
        stammItems={profil.stamm}
        handwerkskarte={handwerkskarte}
      />

      {handwerkskarte.length === 0 ? (
        <PartnerDetailInfoBox>
          Weitere Unterlagen zum Bauauftrag (z. B. Freistellungsbescheinigung, Personalliste)
          erscheinen, sobald Bärenwald dein Angebot übernommen hat — unter „Angebote“ und
          „Aufträge“.
        </PartnerDetailInfoBox>
      ) : null}
    </div>
  );
}
