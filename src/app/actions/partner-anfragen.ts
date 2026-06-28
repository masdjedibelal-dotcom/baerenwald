"use server";

import { declinePartnerAnfrage } from "@/app/actions/partner-auftrag-bestaetigen";

export type PartnerAnfrageAntwortResult =
  | { ok: true }
  | { ok: false; error: string };

/** @deprecated Nur noch Ablehnung — Annahme über confirmPartnerAuftrag. */
export async function respondPartnerAnfrage(opts: {
  anfrageId: string;
  antwort: "akzeptiert" | "abgelehnt";
  konditionenJson?: string;
  grund?: string;
  notiz?: string;
}): Promise<PartnerAnfrageAntwortResult> {
  if (opts.antwort === "akzeptiert") {
    return {
      ok: false,
      error: "Bitte über „Annehmen“ bestätigen.",
    };
  }

  return declinePartnerAnfrage({
    anfrageId: opts.anfrageId,
    grund: opts.grund ?? "",
    notiz: opts.notiz,
  });
}
