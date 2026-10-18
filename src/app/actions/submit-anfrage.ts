"use server";

import { headers } from "next/headers";

import {
  ANFRAGE_ANLIEGEN,
  ANFRAGE_KUNDENTYPEN,
  type AnfrageDaten,
  anfrageBereiche,
  anfrageNachricht,
} from "@/lib/funnel/anfrage-weg";
import { persistLead } from "@/lib/lead/persist-lead";
import { checkRateLimit } from "@/lib/rate-limit";

/** Nur Fotos, die über /api/meldung/upload für diese Anfrage hochgeladen wurden. */
function erlaubteFotos(fotos: string[], sitzung: string): string[] {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  if (!base || !/^anfrage-[a-z0-9-]{8,64}$/.test(sitzung)) return [];
  const prefix = `${base}/storage/v1/object/public/`;
  return fotos
    .filter((u) => typeof u === "string" && u.startsWith(prefix) && u.includes(`/meldung/${sitzung}/`))
    .slice(0, 5);
}

/**
 * Allgemeine Anfrage von der Website (ohne Preisrahmen): Kundentyp, Anliegen → Gewerke,
 * Eckdaten, Beschreibung, Fotos, Kontakt. Landet im CRM als normale Anfrage.
 */
export async function submitAnfrageAction(
  daten: AnfrageDaten
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const h = headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "unknown";
  if (!checkRateLimit(ip, 8, 60 * 60 * 1000, "website_anfrage").allowed) {
    return { ok: false, error: "Zu viele Anfragen. Bitte rufen Sie uns an." };
  }

  const typ = ANFRAGE_KUNDENTYPEN.find((k) => k.id === daten.kundentyp);
  if (!typ) return { ok: false, error: "Bitte wählen Sie aus, wer Sie sind." };
  const anliegen = daten.anliegen.filter((a) => ANFRAGE_ANLIEGEN.some((x) => x.id === a));
  if (!anliegen.length) return { ok: false, error: "Bitte wählen Sie aus, was ansteht." };
  const name = daten.name.trim();
  const email = daten.email.trim();
  const telefon = daten.telefon.trim();
  if (name.length < 2) return { ok: false, error: "Bitte geben Sie Ihren Namen an." };
  if (!email && !telefon) return { ok: false, error: "Bitte geben Sie eine E-Mail-Adresse oder Telefonnummer an." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Bitte geben Sie eine gültige E-Mail-Adresse an." };
  }
  if (!/^\d{5}$/.test(daten.plz.trim())) return { ok: false, error: "Bitte geben Sie eine gültige PLZ an." };
  if (!daten.datenschutz) return { ok: false, error: "Bitte stimmen Sie der Datenschutzerklärung zu." };

  const fotos = erlaubteFotos(daten.fotos ?? [], daten.sitzung);
  const firma = typ.id === "privat" ? null : daten.firma.trim() || null;

  const res = await persistLead({
    name,
    email: email || undefined,
    telefon: telefon || undefined,
    notizen: anfrageNachricht({ ...daten, anliegen }),
    situation: "individuell",
    bereiche: anfrageBereiche(anliegen),
    plz: daten.plz.trim(),
    ort: daten.ort.trim() || undefined,
    strasse: daten.strasse.trim() || undefined,
    zeitraum: daten.zeitraum || null,
    kundentyp: typ.leadKundentyp,
    kunde_typ: typ.kundeTyp,
    firma,
    kanal: "website",
    funnel_quelle: "anfrage",
    funnel_daten: {
      leadType: "anfrage",
      kundentyp_anfrage: typ.id,
      anliegen,
      objektart: daten.objektart || null,
      flaeche: daten.flaeche.trim() || null,
      zeitraumText: daten.zeitraum || null,
      budgetText: daten.budget || null,
      bau: anliegen.includes("bauprojekt") ? daten.bau : null,
      firma,
      ort: daten.ort.trim() || null,
      fotos,
    },
  });
  if (!res.ok) return { ok: false, error: res.error };

  return { ok: true, id: res.id };
}
