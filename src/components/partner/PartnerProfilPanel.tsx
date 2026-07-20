"use client";

import { PartnerFirmendatenScreen } from "@/components/partner/PartnerFirmendatenScreen";
import type {
  PartnerProfilKontext,
  PartnerHandwerkerProfil,
} from "@/lib/partner/get-partner-data";

export function PartnerProfilPanel({
  handwerker,
  profil,
}: {
  handwerker: PartnerHandwerkerProfil;
  profil: PartnerProfilKontext;
}) {
  return <PartnerFirmendatenScreen handwerker={handwerker} profil={profil} />;
}
