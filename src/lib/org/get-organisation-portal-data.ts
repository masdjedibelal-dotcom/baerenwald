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
  excludeMeldeFunnelFotosFromDokumente,
  mergeDokumente,
  type PortalDokument,
} from "@/lib/portal/portal-dokumente";
import { PORTAL_LIST_LEAD_LIMIT } from "@/lib/portal/portal-list-limits";
import { meldeFotosFromLead } from "@/lib/org/org-eingang-utils";
import type {
  OrganisationLead,
  OrganisationObjekt,
} from "@/lib/org/types";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

const EINGANG_SELECT_FULL =
  "id, situation, bereiche, status, created_at, plz, strasse, hausnummer, zeitraum, kontakt_name, preis_min, preis_max, preis_unsicher, kontakt_nachricht, funnel_daten, kunde_objekt_id, anlass, erfassung_von, melder_name, melder_einheit, melder_telefon, melder_email, melde_tracking_token, einladung_token, einladung_status, org_freigabe_status, freigabe_bypass_grund, hv_meldung_status, service_modus, auftraggeber_kunde_id, kunde_id, kostentraeger, kostentraeger_vorgeschlagen, versicherungs_nr, vorgang_phase, kanal";

const EINGANG_SELECT_BASE =
  "id, situation, bereiche, status, created_at, plz, strasse, hausnummer, zeitraum, kontakt_name, preis_min, preis_max, kontakt_nachricht, funnel_daten, kunde_objekt_id, anlass, erfassung_von, melder_name, melder_einheit, melder_telefon, melder_email, einladung_token, einladung_status, org_freigabe_status, service_modus, auftraggeber_kunde_id, kunde_id";

async function loadOrgObjekte(kundeId: string): Promise<OrganisationObjekt[]> {
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

  return rawObjekte.map((o) => ({
    ...o,
    einheitenCount: einheitenCountById[o.id] ?? null,
  }));
}

async function loadEingangLeads(
  kundeId: string,
  listMode: boolean
): Promise<Record<string, unknown>[]> {
  let q = supabaseAdmin
    .from("leads")
    .select(EINGANG_SELECT_FULL)
    .eq("auftraggeber_kunde_id", kundeId)
    .eq("anlass", "meldung")
    .is("geloescht_am", null)
    .order("created_at", { ascending: false });
  if (listMode) q = q.limit(PORTAL_LIST_LEAD_LIMIT);

  const { data: eingangRows, error: eingangErr } = await q;

  if (!eingangErr) {
    return (eingangRows ?? []) as Record<string, unknown>[];
  }

  const geloeschtMissing = /geloescht_am/i.test(eingangErr.message);
  console.warn("[org-portal] eingang (voll):", eingangErr.message);
  let fb = supabaseAdmin
    .from("leads")
    .select(EINGANG_SELECT_BASE)
    .eq("auftraggeber_kunde_id", kundeId)
    .eq("anlass", "meldung")
    .order("created_at", { ascending: false });
  if (!geloeschtMissing) fb = fb.is("geloescht_am", null);
  if (listMode) fb = fb.limit(PORTAL_LIST_LEAD_LIMIT);
  const fallback = await fb;
  if (fallback.error) {
    console.error("[org-portal] eingang (basis):", fallback.error.message);
    return [];
  }
  return (fallback.data ?? []).map((row) => ({
    ...(row as Record<string, unknown>),
    preis_unsicher: false,
    hv_meldung_status: null,
  }));
}

export async function getOrganisationPortalData(
  kundeId: string,
  opts?: { mode?: "list" | "full" }
) {
  if (!isSupabaseConfigured()) return null;

  const mode = opts?.mode ?? "list";
  const listMode = mode !== "full";

  const [base, kunde, objekte, eingangSource] = await Promise.all([
    getPortalDataForKunde(kundeId, { mode }),
    loadOrganisationKunde(kundeId),
    loadOrgObjekte(kundeId),
    loadEingangLeads(kundeId, listMode),
  ]);
  if (!base || !kunde) return null;

  const objektById = new Map(objekte.map((o) => [o.id, o]));

  const resolveObj = (objektId: string | null | undefined) => {
    if (!objektId) return null;
    const o = objektById.get(objektId);
    if (!o) return null;
    const portal = resolvePortalObjekt({
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
          cover_url?: string | null;
        }
      >,
      kunde: { name: kunde.name, adresse: null, plz: null, ort: null },
      leadPlz: o.plz,
    });
    if (!portal) return null;
    return {
      ...portal,
      titel: portal.name,
      adresseZeile: portal.strasse ?? undefined,
      plzOrt: [portal.plz, portal.ort].filter(Boolean).join(" ") || undefined,
    };
  };

  const eingang = eingangSource.map((row) => {
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

  const orgLeads: OrganisationLead[] = base.leads.map((l) => {
    const lead = l as OrganisationLead & {
      kunde_objekt_id?: string | null;
      objekt?: OrganisationLead["objekt"];
    };
    const fromOrg = resolveObj(lead.kunde_objekt_id ?? null);
    return {
      ...lead,
      // Org-Objekt inkl. aktueller cover_url — nicht den Portal-Base-Snapshot ohne Cover
      objekt: fromOrg ?? lead.objekt ?? null,
    };
  });

  const eingangLeadIds = eingang.map((l) => l.id);
  const eingangLeadIdsSet = new Set(eingangLeadIds);

  const [meldungAuftraege, hvFeedbackRows] = await Promise.all([
    loadPortalAuftraegeByLeadIds(eingangLeadIds),
    eingangLeadIds.length
      ? supabaseAdmin
          .from("hv_vorgang_feedback")
          .select("lead_id, feedback_typ, sterne, freitext, created_at")
          .eq("kunde_id", kundeId)
          .in("lead_id", eingangLeadIds)
          .order("created_at", { ascending: true })
          .then((r) => r.data ?? [])
      : Promise.resolve([] as Array<Record<string, unknown>>),
  ]);

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

  const bautagebuchByLeadId: Record<
    string,
    Array<{
      id: string;
      datum?: string;
      created_at?: string;
      titel: string;
      notiz?: string;
      fotos_urls: string[];
    }>
  > = {};
  {
    const {
      loadPartnerDokumentationByAuftragIds,
      mergePortalBautagebuchEntries,
    } = await import("@/lib/portal/load-partner-dokumentation");
    const auftragIds = mergedAuftraege.map((a) => String(a.id));
    const partnerDoku = await loadPartnerDokumentationByAuftragIds(auftragIds);

    for (const a of mergedAuftraege) {
      const leadId =
        (a as { lead_id?: string | null }).lead_id != null
          ? String((a as { lead_id?: string | null }).lead_id)
          : "";
      if (!leadId) continue;
      const legacy = !listMode
        ? (
            (
              a as {
                bautagebuch?: Array<{
                  id: string;
                  datum?: string;
                  created_at?: string;
                  titel?: string;
                  notiz?: string;
                  fotos_urls?: string[];
                }>;
              }
            ).bautagebuch ?? []
          ).map((e) => ({
            id: e.id,
            datum: e.datum,
            created_at: e.created_at,
            titel: e.titel ?? "Eintrag",
            notiz: e.notiz,
            fotos_urls: e.fotos_urls ?? [],
          }))
        : [];
      const partner = partnerDoku.get(String(a.id)) ?? [];
      const merged = mergePortalBautagebuchEntries(legacy, partner);
      if (!merged.length) continue;
      const prev = bautagebuchByLeadId[leadId] ?? [];
      bautagebuchByLeadId[leadId] = mergePortalBautagebuchEntries(prev, merged);
    }
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

  const eingangById = new Map(eingang.map((l) => [l.id, l]));

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

    const lead = eingangById.get(leadId);
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

  for (const row of hvFeedbackRows) {
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

  const dokumenteByLeadId: Record<string, PortalDokument[]> = {};
  // Angebot-PDFs auch im List-Mode (Slim behält sie für Dokumente-Tab / Flow).
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
  if (!listMode) {
    for (const lead of base.leads) {
      const leadId = String((lead as { id: string }).id);
      const leadDocs =
        (lead as { dokumente?: PortalDokument[] }).dokumente ?? [];
      if (leadId && leadDocs.length) {
        dokumenteByLeadId[leadId] = mergeDokumente(
          dokumenteByLeadId[leadId] ?? [],
          excludeMeldeFunnelFotosFromDokumente(
            leadDocs,
            meldeFotosFromLead(lead as OrganisationLead)
          )
        );
      }
    }
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
  }

  const auftragIdByLeadId: Record<string, string> = {
    ...meldungAuftraege.auftragIdByLeadId,
  };
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
