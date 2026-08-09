import { persistLead } from "@/lib/lead/persist-lead";
import { generateMeldeTrackingToken } from "@/lib/melde/melde-tracking";
import { vorgeschlagenerKostentraeger } from "@/lib/vorgang/kostentraeger";
import { supabaseAdmin } from "@/lib/supabase";
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
  /** Strukturierte Mock-FACHFRAGEN-Antworten (`funnel_daten.fachfragen`). */
  fachfragen?: {
    bereichKey: string;
    items: Array<{
      id: string;
      index: number;
      de: string;
      en: string;
      answer: boolean;
    }>;
  } | null;
  /** @deprecated Prefer `direktauftrag`. */
  notfall?: boolean | null;
  /** Sofortmaßnahme → Direktauftrag-Pfad (HV nur Info, wenn freigeschaltet). */
  direktauftrag?: boolean | null;
  terminwunsch?: string | null;
  dringlichkeit?: string | null;
  fotos?: string[];
  plz: string;
  strasse?: string | null;
  hausnummer?: string | null;
  ort?: string | null;
  auftraggeber_kunde_id: string;
  kunde_objekt_id?: string | null;
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

  const direktauftrag =
    input.direktauftrag === true ||
    input.notfall === true ||
    input.kategorie === "notfall";

  const initial = initialHvMeldungState();
  let zeitraum = meldeKategorieToZeitraum(input.kategorie);
  if (direktauftrag) zeitraum = "sofort";
  else if (input.dringlichkeit) zeitraum = input.dringlichkeit;

  // Situation „notfall“ nur bei Sofortmaßnahme — für CRM/Legacy; HV-Badge nutzt Kategorie nicht mehr.
  const situation = direktauftrag
    ? "notfall"
    : meldeKategorieToSituation(input.kategorie);

  // Effektive Direktbeauftragung-Regel (Org + Objekt-Override)
  let notfallDirektAktiv = true;
  {
    const { data: org } = await supabaseAdmin
      .from("kunden")
      .select("notfall_direkt")
      .eq("id", input.auftraggeber_kunde_id)
      .maybeSingle();
    notfallDirektAktiv = org?.notfall_direkt !== false;
    if (input.kunde_objekt_id) {
      const { data: obj } = await supabaseAdmin
        .from("kunden_objekte")
        .select("notfall_direkt")
        .eq("id", input.kunde_objekt_id)
        .maybeSingle();
      if (obj?.notfall_direkt != null) {
        notfallDirektAktiv = Boolean(obj.notfall_direkt);
      }
    }
  }

  const bypassAktiv = direktauftrag && notfallDirektAktiv;

  const result = await persistLead({
    name: input.name,
    email: input.email,
    telefon: input.telefon,
    plz: input.plz,
    strasse: input.strasse ?? undefined,
    hausnummer: input.hausnummer ?? undefined,
    ort: input.ort ?? undefined,
    situation,
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
      ...(input.fachfragen ? { fachfragen: input.fachfragen } : {}),
      direktauftrag,
      notfall: direktauftrag,
      ...(input.terminwunsch
        ? { terminwunsch: input.terminwunsch }
        : {}),
      ...(input.ort?.trim() ? { ort: input.ort.trim() } : {}),
      fotos: input.fotos ?? [],
      quelle: input.kanal,
    },
  });

  if (!result.ok) return result;

  const token = generateMeldeTrackingToken();
  const vorschlag = vorgeschlagenerKostentraeger({
    hv_meldung_status: initial.hv_meldung_status,
    anlass: "meldung",
    funnel_daten: {
      melde_kategorie: input.kategorie,
    },
  });

  let duplikatHinweis = false;
  if (input.einheit?.trim() && input.kunde_objekt_id) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: dup } = await supabaseAdmin
      .from("leads")
      .select("id")
      .eq("kunde_objekt_id", input.kunde_objekt_id)
      .eq("melder_einheit", input.einheit.trim())
      .gte("created_at", since)
      .limit(1)
      .maybeSingle();
    duplikatHinweis = Boolean(dup?.id);
  }

  const patch: Record<string, unknown> = {
    melde_tracking_token: token,
    vorgang_phase: "eingegangen",
    duplikat_hinweis: duplikatHinweis,
  };
  if (bypassAktiv) {
    patch.freigabe_bypass_grund = "akut";
    patch.org_freigabe_status = "nicht_noetig";
  }
  if (vorschlag) {
    patch.kostentraeger = vorschlag;
    patch.kostentraeger_vorgeschlagen = true;
  }

  await supabaseAdmin.from("leads").update(patch).eq("id", result.id);

  if (duplikatHinweis) {
    const { writeAuditEvent } = await import("@/lib/audit/write-audit-event");
    await writeAuditEvent({
      entityType: "lead",
      entityId: result.id,
      aktion: "duplikat_hinweis",
      kundeId: input.auftraggeber_kunde_id,
      payload: { einheit: input.einheit, fenster_h: 24 },
    });
  }

  // Melder-Link / Einladung → HV-Glocke (nicht bei HV-eigener Anlage)
  if (input.erfassung_von === "melder") {
    void import("@/lib/org/notify-hv-neue-meldung").then(
      ({ notifyHvNeueMeldung }) =>
        notifyHvNeueMeldung({ leadId: result.id }).catch((e) =>
          console.error("[persistMeldungLead] hv notify:", e)
        )
    );
    // Verknüpfter Portal-User (kunde_id mit auth) → eigene Glocke
    void import("@/lib/portal/notify-portal-lead-user").then(
      async ({ notifyPortalLeadUser }) => {
        const { MELDE_NOTIF_COPY } = await import(
          "@/lib/org/melde-vorgang-titel"
        );
        await notifyPortalLeadUser({
          leadId: result.id,
          typ: "status",
          titel: MELDE_NOTIF_COPY.meldungEingegangen,
          text: MELDE_NOTIF_COPY.meldungEingegangenBody,
          deepLinkTab: "uebersicht",
          roleOverride: "mieter",
        }).catch((e) =>
          console.error("[persistMeldungLead] portal notify:", e)
        );
      }
    );
  }

  // Eigentümer am Objekt → Glocke „neu“ (Status-only, keine Freigabe)
  void import("@/lib/portal/notify-portal-eigentuemer").then(
    async ({ notifyPortalEigentuemer }) => {
      const { formatMeldeNotifTitel, MELDE_NOTIF_COPY } = await import(
        "@/lib/org/melde-vorgang-titel"
      );
      const titel =
        String(situation ?? "").trim() ||
        String(bereiche?.[0] ?? "").trim() ||
        "Vorgang";
      await notifyPortalEigentuemer({
        leadId: result.id,
        kind: "neu",
        titel: formatMeldeNotifTitel(MELDE_NOTIF_COPY.neueMeldung, { titel }),
        text: `Neuer Vorgang „${titel}“ an Ihrem Objekt.`,
        deepLinkTab: "uebersicht",
        kundeObjektId: input.kunde_objekt_id ?? null,
      }).catch((e) =>
        console.error("[persistMeldungLead] eigentuemer notify:", e)
      );
    }
  );

  return { ...result, meldeTrackingToken: token };
}

export function parseMeldeBereichId(raw: string | undefined): MeldeBereichId {
  const v = String(raw ?? "").trim();
  if (isMeldeBereichId(v)) return v;
  return "sonstiges";
}
