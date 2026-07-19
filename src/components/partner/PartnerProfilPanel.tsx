"use client";

import { PartnerDetailInfoBox } from "@/components/partner/PartnerDetailUi";
import { PartnerFirmendatenScreen } from "@/components/partner/PartnerFirmendatenScreen";
import { PartnerRahmenvertragCard } from "@/components/partner/PartnerRahmenvertragCard";
import type {
  PartnerProfilKontext,
  PartnerHandwerkerProfil,
} from "@/lib/partner/get-partner-data";
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
      <PartnerFirmendatenScreen handwerker={handwerker} />

      <div className="mx-auto w-full max-w-[640px] space-y-6">
        <PartnerRahmenvertragCard
          rahmenvertrag={profil.rahmenvertrag}
          stammItems={profil.stamm}
          handwerkskarte={handwerkskarte}
        />

        {handwerkskarte.length === 0 ? (
          <PartnerDetailInfoBox>
            Weitere Unterlagen zum Bauauftrag (z. B. Freistellungsbescheinigung,
            Personalliste) erscheinen, sobald Bärenwald dein Angebot übernommen
            hat — unter „Angebote“ und „Aufträge“.
          </PartnerDetailInfoBox>
        ) : null}
      </div>
    </div>
  );
}
