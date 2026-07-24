import { loadPartnerBefundeByLeadIds } from "@/lib/org/load-partner-befund";
import { resolveLeadObjektId } from "@/lib/org/match-lead-objekt";
import { getPortalDataForKunde } from "@/lib/portal/get-portal-data";
import {
  isVorgangPortalErledigt,
  vorgangFeedbackBereit,
} from "@/lib/portal/vorgang-feedback-eligibility";
import { resolvePortalObjekt } from "@/lib/portal/portal-objekt";
import { loadOrganisationKunde } from "@/lib/org/load-organisation-kunde";
import {
  loadPortalAuftraegeByLeadIds,
  mergePortalAuftraege,
} from "@/lib/portal/load-auftraege-by-lead-ids";
import type { PortalAuftragKontext } from "@/lib/portal/vorgang-erledigt";
import {
  mergeDokumente,
  type PortalDokument,
} from "@/lib/portal/portal-dokumente";
import type {
  OrganisationLead,
  OrganisationObjekt,
} from "@/lib/org/types";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

const EINGANG_SELECT_FULL =
  "id, situation, bereiche, status, created_at, plz, strasse, hausnummer, zeitraum, kontakt_name, preis_min, preis_max, preis_unsicher, kontakt_nachricht, funnel_daten, kunde_objekt_id, anlass, erfassung_von, melder_name, melder_einheit, melder_telefon, melder_email, melde_tracking_token, einladung_token, einladung_status, org_freigabe_status, hv_meldung_status, service_modus, auftraggeber_kunde_id, kunde_id, kostentraeger, kostentraeger_vorgeschlagen, versicherungs_nr, vorgang_phase, kanal";

const EINGANG_SELECT_BASE =
  "id, situation, bereiche, status, created_at, plz, strasse, hausnummer, zeitraum, kontakt_name, preis_min, preis_max, kontakt_nachricht, funnel_daten, kunde_objekt_id, anlass, erfassung_von, melder_name, melder_einheit, melder_telefon, melder_email, einladung_token, einladung_status, org_freigabe_status, service_modus, auftraggeber_kunde_id, kunde_id";

export async function getOrganisationPortalData(kundeId: string) {
  if (!isSupabaseConfigured()) return null;

  const base = await getPortalDataForKunde(kundeId);
  if (!base) return null;

  const kunde = await loadOrganisationKunde(kundeId);
  if (!kunde) return null;

  const { data: objekteRows, error: objErr } = await supabaseAdmin
    .from("kunden_objekte")
    .select(
      "id, kunde_id, titel, strasse, hausnummer, plz, ort, typ, melde_slug, melde_aktiv, einheiten_hinweis, notizen_intern, kostenstelle_nr, freigabe_schwelle_eur, cover_url, created_at"
    )
    .eq("kunde_id", kundeId)
    .order("titel", { ascending: true });

  let rawObjekte = (objekteRows ?? []) as OrganisationObjekt[];
  if (objErr && /cover_url/i.test(objErr.message)) {
    const { data: fallback } = await supabaseAdmin
      .from("kunden_objekte")
      .select(
        "id, kunde_id, titel, strasse, hausnummer, plz, ort, typ, melde_slug, melde_aktiv, einheiten_hinweis, notizen_intern, kostenstelle_nr, freigabe_schwelle_eur, created_at"
      )
      .eq("kunde_id", kundeId)
      .order("titel", { ascending: true });
    rawObjekte = (fallback ?? []) as OrganisationObjekt[];
  } else if (objErr && /typ/i.test(objErr.message)) {
    const { data: fallback } = await supabaseAdmin
      .from("kunden_objekte")
      .select(
        "id, kunde_id, titel, strasse, hausnummer, plz, ort, melde_slug, melde_aktiv, einheiten_hinweis, notizen_intern, kostenstelle_nr, freigabe_schwelle_eur, created_at"
      )
      .eq("kunde_id", kundeId)
      .order("titel", { ascending: true });
    rawObjekte = (fallback ?? []) as OrganisationObjekt[];
  } else if (objErr) {
    console.error("[getOrganisationPortalData] objekte", objErr.message);
    rawObjekte = [];
  }

  const objektIds = rawObjekte.map((o) => o.id);
  const einheitenCountById: Record<string, number> = {};
  if (objektIds.length) {
    const { data: ehRows } = await supabaseAdmin
      .from("objekt_einheiten")
      .select("kunde_objekt_id, aktiv")
      .in("kunde_objekt_id", objektIds);
    for (const row of ehRows ?? []) {
      const oid = String(
        (row as { kunde_objekt_id?: string }).kunde_objekt_id ?? ""
      );
      if (!oid) continue;
      if ((row as { aktiv?: boolean }).aktiv === false) continue;
      einheitenCountById[oid] = (einheitenCountById[oid] ?? 0) + 1;
    }
  }

  const objekte: OrganisationObjekt[] = rawObjekte.map((o) => ({
    ...o,
    einheitenCount: einheitenCountById[o.id] ?? null,
  }));
  const objektById = new Map(objekte.map((o) => [o.id, o]));

  const resolveObj = (objektId: string | null | undefined) => {
    if (!objektId) return null;
    const o = objektById.get(objektId);
    if (!o) return null;
    return resolvePortalObjekt({
      objektId,
      objektById: objektById as Map<
        string,
        {
          id: string;
          titel: string | null;
          strasse: string | null;
          hausnummer: string | null;
          plz: string | null;
          ort: string | null;
        }
      >,
      kunde: { name: kunde.name, adresse: null, plz: null, ort: null },
      leadPlz: o.plz,
    });
  };

  const { data: eingangRows, error: eingangErr } = await supabaseAdmin
    .from("leads")
    .select(EINGANG_SELECT_FULL)
    .eq("auftraggeber_kunde_id", kundeId)
    .eq("anlass", "meldung")
    .order("created_at", { ascending: false });

  let eingangSource: Record<string, unknown>[] | null = (eingangRows ??
    null) as Record<string, unknown>[] | null;
  if (eingangErr) {
    console.warn("[org-portal] eingang (voll):", eingangErr.message);
    const fallback = await supabaseAdmin
      .from("leads")
      .select(EINGANG_SELECT_BASE)
      .eq("auftraggeber_kunde_id", kundeId)
      .eq("anlass", "meldung")
      .order("created_at", { ascending: false });
    if (fallback.error) {
      console.error("[org-portal] eingang (basis):", fallback.error.message);
      eingangSource = [];
    } else {
      eingangSource = (fallback.data ?? []).map((row) => ({
        ...(row as Record<string, unknown>),
        preis_unsicher: false,
        hv_meldung_status: null,
      }));
    }
  }

  const eingang = (eingangSource ?? []).map((row) => {
    const r = row as {
      kunde_objekt_id?: string | null;
      strasse?: string | null;
      hausnummer?: string | null;
      plz?: string | null;
      funnel_daten?: unknown;
    };
    const matchedId =
      resolveLeadObjektId(r, objekte) ?? r.kunde_objekt_id ?? null;
    return {
      ...(row as object),
      objekt: resolveObj(matchedId),
    };
  }) as OrganisationLead[];

  const orgLeads: OrganisationLead[] = base.leads.map((l) => ({
    ...(l as OrganisationLead),
    objekt: (l as { objekt?: OrganisationLead["objekt"] }).objekt ?? null,
  }));

  const eingangLeadIds = eingang.map((l) => l.id);
  const eingangLeadIdsSet = new Set(eingangLeadIds);
  const meldungAuftraege = await loadPortalAuftraegeByLeadIds(eingangLeadIds);

  const mergedAuftraege = mergePortalAuftraege(
    base.auftraege as Array<{ id: string } & Record<string, unknown>>,
    meldungAuftraege.auftraege as Array<{ id: string } & Record<string, unknown>>
  ) as typeof base.auftraege;

  const leadById = new Map<string, OrganisationLead>();
  for (const l of eingang) leadById.set(l.id, l);
  for (const l of orgLeads) {
    if (!leadById.has(l.id)) leadById.set(l.id, l);
  }
  const mergedLeads = Array.from(leadById.values());

  const auftragKontextByLeadId: Record<string, PortalAuftragKontext> = {
    ...meldungAuftraege.kontextByLeadId,
  };
  for (const a of mergedAuftraege) {
    const leadId =
      (a as { lead_id?: string | null }).lead_id != null
        ? String((a as { lead_id?: string | null }).lead_id)
        : "";
    if (!leadId || auftragKontextByLeadId[leadId]) continue;
    auftragKontextByLeadId[leadId] = {
      status: (a as { status?: string | null }).status,
      fortschritt: (a as { fortschritt?: number | null }).fortschritt,
      positionen: (a as { positionen?: PortalAuftragKontext["positionen"] }).positionen,
    };
  }

  const partnerBefundByLeadId = await loadPartnerBefundeByLeadIds(
    eingang.map((l) => l.id)
  );

  const bautagebuchByLeadId: Record<
    string,
    Array<{
      id: string;
      datum?: string;
      titel: string;
      notiz?: string;
      fotos_urls: string[];
    }>
  > = {};
  for (const a of mergedAuftraege) {
    const leadId =
      (a as { lead_id?: string | null }).lead_id != null
        ? String((a as { lead_id?: string | null }).lead_id)
        : "";
    const entries = (a as { bautagebuch?: Array<{
      id: string;
      datum?: string;
      titel?: string;
      notiz?: string;
      fotos_urls?: string[];
    }> }).bautagebuch;
    if (!leadId || !entries?.length) continue;
    bautagebuchByLeadId[leadId] = entries.map((e) => ({
      id: e.id,
      datum: e.datum,
      titel: e.titel ?? "Eintrag",
      notiz: e.notiz,
      fotos_urls: e.fotos_urls ?? [],
    }));
  }

  const hwErledigtByLeadId: Record<string, boolean> = {};
  const feedbackBereitByLeadId: Record<string, boolean> = {};
  const hvFeedbackByLeadId: Record<
    string,
    {
      bewertung?: { sterne: number; freitext?: string | null } | null;
      maengel?: Array<{ freitext?: string | null; created_at?: string }>;
    }
  > = {};

  for (const a of mergedAuftraege) {
    const leadId =
      (a as { lead_id?: string | null }).lead_id != null
        ? String((a as { lead_id?: string | null }).lead_id)
        : "";
    if (!leadId || !eingangLeadIdsSet.has(leadId)) continue;

    const positionen = (a as {
      positionen?: Array<{
        handwerker_id?: string | null;
        handwerker_status?: string | null;
        leistung_status?: string | null;
      }>;
    }).positionen;

    const lead = eingang.find((l) => l.id === leadId);
    const erledigt = isVorgangPortalErledigt({
      leadVorgangPhase: lead?.vorgang_phase,
      hv_meldung_status: lead?.hv_meldung_status,
      auftragStatus: (a as { status?: string | null }).status,
      auftragFortschritt: (a as { fortschritt?: number | null }).fortschritt,
      positionen,
    });
    if (erledigt) hwErledigtByLeadId[leadId] = true;

    feedbackBereitByLeadId[leadId] = vorgangFeedbackBereit({
      leadVorgangPhase: lead?.vorgang_phase,
      hv_meldung_status: lead?.hv_meldung_status,
      auftragStatus: (a as { status?: string | null }).status,
      auftragFortschritt: (a as { fortschritt?: number | null }).fortschritt,
      positionen,
    });
  }

  if (eingangLeadIds.length) {
    const { data: hvFeedbackRows } = await supabaseAdmin
      .from("hv_vorgang_feedback")
      .select("lead_id, feedback_typ, sterne, freitext, created_at")
      .eq("kunde_id", kundeId)
      .in("lead_id", eingangLeadIds)
      .order("created_at", { ascending: true });

    for (const row of hvFeedbackRows ?? []) {
      const lid = String((row as { lead_id: string }).lead_id);
      const typ = String((row as { feedback_typ: string }).feedback_typ);
      if (!hvFeedbackByLeadId[lid]) {
        hvFeedbackByLeadId[lid] = { bewertung: null, maengel: [] };
      }
      if (typ === "bewertung") {
        hvFeedbackByLeadId[lid].bewertung = {
          sterne: Number((row as { sterne: number }).sterne),
          freitext: (row as { freitext?: string | null }).freitext ?? null,
        };
      } else {
        hvFeedbackByLeadId[lid].maengel = hvFeedbackByLeadId[lid].maengel ?? [];
        hvFeedbackByLeadId[lid].maengel!.push({
          freitext: (row as { freitext?: string | null }).freitext ?? null,
          created_at: (row as { created_at?: string }).created_at,
        });
      }
    }
  }

  const dokumenteByLeadId: Record<string, PortalDokument[]> = {};
  for (const a of mergedAuftraege) {
    const leadId =
      (a as { lead_id?: string | null }).lead_id != null
        ? String((a as { lead_id?: string | null }).lead_id)
        : "";
    const docs = (a as { dokumente?: PortalDokument[] }).dokumente ?? [];
    if (leadId && docs.length) {
      dokumenteByLeadId[leadId] = mergeDokumente(
        dokumenteByLeadId[leadId] ?? [],
        docs
      );
    }
  }
  for (const ang of base.angebote) {
    const leadId =
      (ang as { lead_id?: string | null }).lead_id != null
        ? String((ang as { lead_id?: string | null }).lead_id)
        : "";
    const angDocs = (ang as { dokumente?: PortalDokument[] }).dokumente ?? [];
    if (leadId && angDocs.length) {
      dokumenteByLeadId[leadId] = mergeDokumente(
        dokumenteByLeadId[leadId] ?? [],
        angDocs
      );
    }
  }

  const auftragIdByLeadId: Record<string, string> = {};
  for (const a of mergedAuftraege) {
    const leadId =
      (a as { lead_id?: string | null }).lead_id != null
        ? String((a as { lead_id?: string | null }).lead_id)
        : "";
    const aid = String((a as { id: string }).id);
    if (leadId) auftragIdByLeadId[leadId] = aid;
  }

  const hvAbnahmeByLeadId: Record<
    string,
    {
      art: "ohne_vorbehalt" | "mit_anmerkung" | "zurueckgewiesen";
      anmerkung?: string | null;
      signiert_name: string;
      signiert_am: string;
    }
  > = {};

  const auftragIds = Object.values(auftragIdByLeadId);
  if (auftragIds.length) {
    const { data: abnahmeRows } = await supabaseAdmin
      .from("hv_portal_abnahmen")
      .select("lead_id, art, anmerkung, signiert_name, signiert_am")
      .in("auftrag_id", auftragIds);

    for (const row of abnahmeRows ?? []) {
      const lid = String((row as { lead_id?: string | null }).lead_id ?? "");
      if (!lid) continue;
      hvAbnahmeByLeadId[lid] = {
        art: (row as { art: "ohne_vorbehalt" | "mit_anmerkung" | "zurueckgewiesen" }).art,
        anmerkung: (row as { anmerkung?: string | null }).anmerkung ?? null,
        signiert_name: String((row as { signiert_name: string }).signiert_name),
        signiert_am: String((row as { signiert_am: string }).signiert_am),
      };
    }
  }

  return {
    kunde,
    objekte,
    eingang,
    leads: mergedLeads,
    angebote: base.angebote,
    auftraege: mergedAuftraege,
    partnerBefundByLeadId,
    bautagebuchByLeadId,
    hwErledigtByLeadId,
    feedbackBereitByLeadId,
    hvFeedbackByLeadId,
    auftragKontextByLeadId,
    dokumenteByLeadId,
    auftragIdByLeadId,
    hvAbnahmeByLeadId,
  };
}
