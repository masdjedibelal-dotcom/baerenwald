import { persistLead } from "@/lib/lead/persist-lead";
import {
  meldeKategorieToSituation,
  meldeKategorieToZeitraum,
} from "@/lib/org/melde-kategorien";
import { initialHvMeldungState } from "@/lib/org/hv-meldung-workflow";
import {
  isMeldeBereichId,
  meldeBereichToFunnelBereiche,
  type MeldeBereichId,
} from "@/lib/org/melde-bereiche";
import { mapMeldeToPrice } from "@/lib/org/map-melde-to-price";
import type { MeldeKategorie } from "@/lib/org/types";

export type PersistMeldungLeadInput = {
  name: string;
  email?: string;
  telefon?: string;
  einheit?: string;
  beschreibung: string;
  kategorie: MeldeKategorie;
  bereichId: MeldeBereichId;
  fachdetailAnswers?: Record<string, string | string[]>;
  dringlichkeit?: string | null;
  fotos?: string[];
  plz: string;
  strasse?: string | null;
  hausnummer?: string | null;
  auftraggeber_kunde_id: string;
  kunde_objekt_id: string;
  kanal: "hv_melder_link" | "hv_direkt" | "hv_einladung";
  erfassung_von: "melder" | "organisation";
  einladung_token?: string | null;
  einladung_status?: string | null;
  skipInternMail?: boolean;
};

export async function persistMeldungLead(input: PersistMeldungLeadInput) {
  const bereiche = meldeBereichToFunnelBereiche(input.bereichId);
  const price = mapMeldeToPrice({
    kategorie: input.kategorie,
    bereichId: input.bereichId,
    plz: input.plz,
    fachdetailAnswers: input.fachdetailAnswers,
    dringlichkeit: input.dringlichkeit,
  });

  const initial = initialHvMeldungState();
  let zeitraum = meldeKategorieToZeitraum(input.kategorie);
  if (input.kategorie === "notfall") zeitraum = "sofort";
  else if (input.dringlichkeit) zeitraum = input.dringlichkeit;

  return persistLead({
    name: input.name,
    email: input.email,
    telefon: input.telefon,
    plz: input.plz,
    strasse: input.strasse ?? undefined,
    hausnummer: input.hausnummer ?? undefined,
    situation: meldeKategorieToSituation(input.kategorie),
    bereiche,
    zeitraum,
    kanal: input.kanal,
    anlass: "meldung",
    erfassung_von: input.erfassung_von,
    auftraggeber_kunde_id: input.auftraggeber_kunde_id,
    kunde_objekt_id: input.kunde_objekt_id,
    melder_name: input.name,
    melder_einheit: input.einheit || null,
    melder_telefon: input.telefon || null,
    melder_email: input.email || null,
    org_freigabe_status: initial.org_freigabe_status,
    hv_meldung_status: initial.hv_meldung_status,
    preis_min: price.preis_min,
    preis_max: price.preis_max,
    preis_unsicher: price.preis_unsicher,
    einladung_token: input.einladung_token ?? undefined,
    einladung_status: input.einladung_status ?? undefined,
    skipKundeMail: true,
    skipInternMail: input.skipInternMail ?? true,
    notizen: input.beschreibung,
    funnel_quelle: "meldung",
    funnel_daten: {
      melde_kategorie: input.kategorie,
      melde_bereich: input.bereichId,
      fachdetailAnswers: input.fachdetailAnswers ?? {},
      fotos: input.fotos ?? [],
      quelle: input.kanal,
    },
  });
}

export function parseMeldeBereichId(raw: string | undefined): MeldeBereichId {
  const v = String(raw ?? "").trim();
  if (isMeldeBereichId(v)) return v;
  return "sonstiges";
}
