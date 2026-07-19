"use server";

import {
  confirmPartnerAuftragZuweisung,
  declinePartnerAuftragZuweisung,
} from "@/app/actions/partner-auftrag-bestaetigen";

export type PartnerAuftragAntwortResult =
  | { ok: true; angebotAnfrageId?: string | null }
  | { ok: false; error: string };

/** @deprecated Nur noch Wrapper — Annahme/Ablehnung über confirm/decline. */
export async function respondPartnerAuftragZuweisung(opts: {
  auftragId: string;
  antwort: "akzeptiert" | "abgelehnt";
  grund?: string;
  notiz?: string;
  konditionenJson?: string;
}): Promise<PartnerAuftragAntwortResult> {
  if (opts.antwort === "akzeptiert") {
    const res = await confirmPartnerAuftragZuweisung({
      auftragId: opts.auftragId,
      gelesen: true,
      verbindlich: true,
    });
    if (!res.ok) return res;
    return { ok: true, angebotAnfrageId: null };
  }

  const res = await declinePartnerAuftragZuweisung({
    auftragId: opts.auftragId,
    grund: opts.grund ?? "",
    notiz: opts.notiz,
  });
  if (!res.ok) return res;
  return { ok: true, angebotAnfrageId: null };
}
