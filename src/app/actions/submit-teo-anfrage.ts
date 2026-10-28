"use server";

import { headers } from "next/headers";

import {
  TEO_DRINGLICHKEIT,
  TEO_FAELLE,
  type TeoAnfrageDaten,
  teoAnfrageNachricht,
  teoBereiche,
} from "@/lib/funnel/teo-anfrage";
import { persistLead } from "@/lib/lead/persist-lead";
import { istTeo } from "@/lib/marke";
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

const SITUATION: Record<string, string> = {
  schaden: "reparatur",
  massnahme: "individuell",
  betrieb: "betreuung",
  kennenlernen: "individuell",
};

/**
 * Servus TEO: Anfrage einer Hausverwaltung oder WEG von der Website — Fall, Details, Objekt, Kontakt.
 * Landet im CRM als Anfrage mit Kundentyp Hausverwaltung, ohne Preisrahmen.
 */
export async function submitTeoAnfrageAction(
  d: TeoAnfrageDaten
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!istTeo) return { ok: false, error: "Nicht verfügbar." };
  const h = headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "unknown";
  if (!checkRateLimit(ip, 8, 60 * 60 * 1000, "teo_anfrage").allowed) {
    return { ok: false, error: "Zu viele Anfragen. Bitte rufen Sie uns an." };
  }

  if (!TEO_FAELLE.some((f) => f.id === d.fall)) return { ok: false, error: "Bitte wählen Sie aus, worum es geht." };
  const name = d.name.trim();
  const email = d.email.trim();
  const telefon = d.telefon.trim();
  if (name.length < 2) return { ok: false, error: "Bitte geben Sie Ihren Namen an." };
  if (!email && !telefon) return { ok: false, error: "Bitte geben Sie eine E-Mail-Adresse oder Telefonnummer an." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Bitte geben Sie eine gültige E-Mail-Adresse an." };
  }
  const brauchtObjekt = d.fall !== "kennenlernen";
  if (brauchtObjekt && !/^\d{5}$/.test(d.plz.trim())) return { ok: false, error: "Bitte geben Sie die PLZ des Objekts an." };
  if (!d.datenschutz) return { ok: false, error: "Bitte stimmen Sie der Datenschutzerklärung zu." };

  const fotos = erlaubteFotos(d.fotos ?? [], d.sitzung);
  const firma = d.firma.trim() || null;
  const notfall = d.fall === "schaden" && d.dringlichkeit === "notfall";
  const zeitraum = d.fall === "schaden" ? TEO_DRINGLICHKEIT.find((x) => x.id === d.dringlichkeit)?.zeitraum ?? null : d.start || null;

  const res = await persistLead({
    name,
    email: email || undefined,
    telefon: telefon || undefined,
    notizen: teoAnfrageNachricht(d),
    situation: notfall ? "notfall" : SITUATION[d.fall] ?? "individuell",
    bereiche: teoBereiche(d),
    plz: d.plz.trim() || undefined,
    ort: d.ort.trim() || undefined,
    strasse: d.strasse.trim() || undefined,
    zeitraum,
    kundentyp: "hausverwaltung",
    kunde_typ: "hausverwaltung",
    firma,
    kanal: "website",
    funnel_quelle: "teo_anfrage",
    funnel_daten: {
      leadType: "teo_anfrage",
      fall: d.fall,
      absender: d.absender,
      schaden:
        d.fall === "schaden"
          ? { arten: d.schadenArten, ort: d.schadenOrt || null, einheit: d.einheit.trim() || null, dringlichkeit: d.dringlichkeit || null, kontaktVorOrt: d.kontaktVorOrt.trim() || null }
          : null,
      massnahme:
        d.fall === "massnahme"
          ? { massnahmen: d.massnahmen, frist: d.frist || null, angebote: d.angebote || null, einheiten: d.einheiten.trim() || null, baujahr: d.baujahr.trim() || null }
          : null,
      betrieb:
        d.fall === "betrieb"
          ? { leistungen: d.leistungen, einheiten: d.einheiten.trim() || null, treppenhaeuser: d.treppenhaeuser.trim() || null, start: d.start || null }
          : null,
      kennenlernen:
        d.fall === "kennenlernen" ? { objekte: d.objekteAnzahl.trim() || null, einheiten: d.einheitenGesamt.trim() || null } : null,
      firma,
      ort: d.ort.trim() || null,
      fotos,
    },
  });
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, id: res.id };
}
