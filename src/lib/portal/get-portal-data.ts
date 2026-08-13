import {
  parseAngebotPositionenMitPreis,
  resolveAngebotGesamtBrutto,
} from "@/lib/portal/portal-angebot-display";
import { resolvePortalAnsprechpartner } from "@/lib/portal/portal-ansprechpartner";
import { buildAngebotPortalDisplay } from "@/lib/portal/portal-display";
import { resolvePrivatPortalTitel } from "@/lib/portal/portal-titel";
import { splitKundePortalPipeline } from "@/lib/portal/portal-pipeline";
import {
  dokumenteFromAngebot,
  dokumenteFromAuftrag,
  dokumenteFromUrls,
} from "@/lib/portal/portal-dokumente";
import { mapPortalRechnungForResolver } from "@/lib/crm-vorgang/portal-resolve";
import {
  resolvePortalObjekt,
  type PortalObjekt,
} from "@/lib/portal/portal-objekt";
import { isHvPortalLead } from "@/lib/portal/hv-portal-lead";
import { resolvePartnerFileUrl, resolvePartnerFileUrls } from "@/lib/partner/partner-storage";
import {
  PORTAL_LIST_AUFTRAG_LIMIT,
  PORTAL_LIST_LEAD_LIMIT,
} from "@/lib/portal/portal-list-limits";
import { handwerkerFirmenLabel } from "@/lib/portal2/handwerker-display";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

type PortalPositionRow = {
  id: string;
  auftrag_id: string;
  gewerk_name: string | null;
  leistung_name: string | null;
  beschreibung: string | null;
  leistung_status: string | null;
  handwerker_status: string | null;
  handwerker_id: string | null;
  menge: number | null;
  lohn_fix: number | null;
  material_fix: number | null;
  aenderung_typ: string | null;
  preis_alt: number | null;
  kunde_akzeptiert_at: string | null;
};

type PortalBautagebuchRow = {
  id: string;
  auftrag_id: string;
  datum: string | null;
  titel: string | null;
  beschreibung: string | null;
  foto_urls: unknown;
  fuer_kunde_freigegeben: boolean | null;
  eintrag_typ?: string | null;
};

type PortalKundenObjektRow = {
  id: string;
  titel: string | null;
  strasse: string | null;
  hausnummer: string | null;
  plz: string | null;
  ort: string | null;
  cover_url?: string | null;
};

type PortalAngebotRow = {
  id: string;
  angebotsnr: string | null;
  lead_id: string | null;
  kunde_objekt_id: string | null;
  status_einfach: string | null;
  status?: string | null;
  /** DB-Spalte `gesamt_fix` — im Mapper als gesamt_preis. */
  gesamt_preis: number | null;
  gesamt_min: number | null;
  gesamt_max: number | null;
  gueltig_bis: string | null;
  leistungsumfang: string | null;
  notizen: string | null;
  positionen: unknown;
  created_at: string | null;
  gesendet_am: string | null;
  gesendet_kunde_at?: string | null;
  pdf_url: string | null;
  /** D11 — optional bis Migration applied. */
  herkunft?: string | null;
};

type PortalRechnungRow = {
  id: string;
  auftrag_id: string;
  rechnungsnummer: string | null;
  pdf_url: string | null;
  status: string | null;
  rechnungsdatum: string | null;
  gesendet_at: string | null;
  faellig_am?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type PortalTimelineRow = {
  id: string;
  auftrag_id: string;
  titel: string | null;
  beschreibung: string | null;
  foto_urls: string[] | null;
  created_at: string | null;
  fuer_kunde_freigegeben: boolean | null;
};

function extractUrlsFromUnknown(value: unknown): string[] {
  const out = new Set<string>();
  const visit = (node: unknown) => {
    if (!node) return;
    if (typeof node === "string") {
      const direct = node.trim();
      if (/^https?:\/\//i.test(direct)) out.add(direct);
      const matches = node.match(/https?:\/\/[^\s)"']+/gi) ?? [];
      matches.forEach((m) => out.add(m.trim()));
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (typeof node === "object") {
      Object.values(node as Record<string, unknown>).forEach(visit);
    }
  };
  visit(value);
  return Array.from(out);
}

/** Lead-Anhänge für Dokumente — ohne Melde-Funnel-Fotos (die gehören in Details). */
function extractLeadDokumentUrls(lead: {
  funnel_daten?: unknown;
  kontakt_nachricht?: unknown;
}): string[] {
  const urls: string[] = [
    ...extractUrlsFromUnknown(lead.kontakt_nachricht),
  ];
  const fd = lead.funnel_daten;
  if (fd && typeof fd === "object" && !Array.isArray(fd)) {
    const { fotos: _fotos, ...rest } = fd as Record<string, unknown>;
    urls.push(...extractUrlsFromUnknown(rest));
  }
  return urls;
}

export type PortalDataLoadMode = "list" | "full";

export type PortalDataLoadOpts = {
  /**
   * list (Default für Dashboard): ohne Signed URLs / schwere Medien.
   * full: inkl. Bautagebuch-Fotos, Abnahme-URLs signiert (Detail / Legacy).
   */
  mode?: PortalDataLoadMode;
  /** Optional: nur diese Lead-IDs laden (Detail on demand). */
  leadIds?: string[];
};

export async function getPortalDataForKunde(
  kundeId: string,
  opts?: PortalDataLoadOpts
) {
  if (!isSupabaseConfigured()) return null;

  const listMode = (opts?.mode ?? "list") !== "full";
  const onlyLeadIds = (opts?.leadIds ?? [])
    .map((x) => String(x ?? "").trim())
    .filter(Boolean);
  const id = kundeId.trim();
  if (!id) return null;

  const { data: kundePrimary, error: kundePrimaryErr } = await supabaseAdmin
    .from("kunden")
    .select(
      "id, name, email, telefon, plz, ort, adresse, auth_user_id, portal_modus, freigabe_schwelle_eur, typ"
    )
    .eq("id", id)
    .maybeSingle();

  let kundeRow = (!kundePrimaryErr ? kundePrimary : null) as {
    id: string;
    name?: string | null;
    email?: string | null;
    telefon?: string | null;
    plz?: string | null;
    ort?: string | null;
    adresse?: string | null;
    auth_user_id?: string | null;
    portal_modus?: string | null;
    freigabe_schwelle_eur?: number | null;
    typ?: string | null;
  } | null;

  if (!kundeRow) {
    const { data: kundeFallback } = await supabaseAdmin
      .from("kunden")
      .select(
        "id, name, email, plz, ort, adresse, auth_user_id, portal_modus, freigabe_schwelle_eur"
      )
      .eq("id", id)
      .maybeSingle();
    kundeRow = kundeFallback as typeof kundeRow;
  }

  if (!kundeRow && kundePrimaryErr && /telefon/i.test(kundePrimaryErr.message)) {
    const { data: ohneTelefon } = await supabaseAdmin
      .from("kunden")
      .select(
        "id, name, email, plz, ort, adresse, auth_user_id, portal_modus, freigabe_schwelle_eur, typ"
      )
      .eq("id", id)
      .maybeSingle();
    kundeRow = ohneTelefon as typeof kundeRow;
  }

  if (!kundeRow) return null;

  const kunde = kundeRow;

  let objekteRows: PortalKundenObjektRow[] | null = null;
  {
    const primary = await supabaseAdmin
      .from("kunden_objekte")
      .select("id, titel, strasse, hausnummer, plz, ort, cover_url")
      .eq("kunde_id", kundeRow.id)
      .order("titel", { ascending: true });
    if (primary.error && /cover_url/i.test(primary.error.message)) {
      const fallback = await supabaseAdmin
        .from("kunden_objekte")
        .select("id, titel, strasse, hausnummer, plz, ort")
        .eq("kunde_id", kundeRow.id)
        .order("titel", { ascending: true });
      objekteRows = (fallback.data ?? []) as PortalKundenObjektRow[];
    } else {
      objekteRows = (primary.data ?? []) as PortalKundenObjektRow[];
    }
  }

  const objektById = new Map<string, PortalKundenObjektRow>();
  for (const o of objekteRows ?? []) {
    objektById.set(String(o.id), o);
  }

  const resolveObj = (
    objektId: string | null | undefined,
    leadPlz?: string | null
  ): PortalObjekt | null =>
    resolvePortalObjekt({
      objektId,
      objektById,
      kunde: kundeRow,
      leadPlz,
    });

  const leadSelectList =
    "id, situation, bereiche, status, vorgang_phase, created_at, plz, strasse, hausnummer, zeitraum, kontakt_name, preis_min, preis_max, budget_ca, kontakt_nachricht, funnel_daten, kunde_objekt_id, anlass, kanal, auftraggeber_kunde_id, hv_meldung_status, org_freigabe_status, freigabe_bypass_grund, melde_tracking_token, melder_name, melder_einheit, melder_telefon, melder_email, kostentraeger, kostentraeger_vorgeschlagen, versicherungs_nr";

  let leadsQuery = supabaseAdmin
    .from("leads")
    .select(leadSelectList)
    .is("geloescht_am", null)
    .order("created_at", { ascending: false });
  if (onlyLeadIds.length) {
    // Detail: Lead-IDs sind bereits zugriffsprüft (kunde oder Auftraggeber).
    leadsQuery = leadsQuery.in("id", onlyLeadIds);
  } else {
    leadsQuery = leadsQuery.eq("kunde_id", kunde.id);
    if (listMode) leadsQuery = leadsQuery.limit(PORTAL_LIST_LEAD_LIMIT);
  }
  let { data: leads, error: leadsErr } = await leadsQuery;
  if (leadsErr && /geloescht_am/i.test(leadsErr.message)) {
    let fb = supabaseAdmin
      .from("leads")
      .select(leadSelectList)
      .order("created_at", { ascending: false });
    if (onlyLeadIds.length) fb = fb.in("id", onlyLeadIds);
    else {
      fb = fb.eq("kunde_id", kunde.id);
      if (listMode) fb = fb.limit(PORTAL_LIST_LEAD_LIMIT);
    }
    const retry = await fb;
    leads = retry.data;
    leadsErr = retry.error;
  }
  if (leadsErr) console.warn("[portal] leads:", leadsErr.message);

  const leadIds = (leads ?? []).map((l) => l.id);

  const leadObjektIdByLeadId = new Map<string, string | null>();
  const leadPlzByLeadId = new Map<string, string | null>();
  for (const l of leads ?? []) {
    const raw = l as {
      id: string;
      kunde_objekt_id?: string | null;
      plz?: string | null;
    };
    const lid = String(raw.id);
    leadObjektIdByLeadId.set(
      lid,
      raw.kunde_objekt_id != null ? String(raw.kunde_objekt_id) : null
    );
    leadPlzByLeadId.set(lid, raw.plz ?? null);
  }

  /** Nur Spalten, die in Supabase existieren (kein budget/phasen — sonst leere Auftragsliste). */
  const auftragSelect =
    "id, titel, status, fortschritt, start_datum, end_datum, abnahme_datum, abnahme_protokoll_url, abschlussdokumentation_url, abschlussdokumentation_gesendet_at, versicherungsakte_pdf_url, created_at, lead_id, kunde_id, angebot_id, betreuer_id, updated_at";

  const mergeAuftraege = (
    rows: Array<Record<string, unknown>> | null | undefined
  ) => {
    for (const row of rows ?? []) {
      auftraegeById.set(String(row.id), row);
    }
  };

  const auftraegeById = new Map<string, Record<string, unknown>>();

  const [{ data: auftraegeByKunde, error: aufKundeErr }, auftraegeByLeadRes] =
    await Promise.all([
      onlyLeadIds.length
        ? Promise.resolve({ data: null, error: null })
        : (() => {
            let q = supabaseAdmin
              .from("auftraege")
              .select(auftragSelect)
              .eq("kunde_id", kunde.id)
              .order("created_at", { ascending: false });
            if (listMode) q = q.limit(PORTAL_LIST_AUFTRAG_LIMIT);
            return q;
          })(),
      leadIds.length > 0
        ? (() => {
            let q = supabaseAdmin
              .from("auftraege")
              .select(auftragSelect)
              .in("lead_id", leadIds)
              .order("created_at", { ascending: false });
            if (listMode) q = q.limit(PORTAL_LIST_AUFTRAG_LIMIT);
            return q;
          })()
        : Promise.resolve({ data: null, error: null }),
    ]);
  if (aufKundeErr) console.warn("[portal] auftraege kunde_id:", aufKundeErr.message);
  mergeAuftraege(auftraegeByKunde as Record<string, unknown>[] | null);
  if (auftraegeByLeadRes.error) {
    console.warn("[portal] auftraege lead_id:", auftraegeByLeadRes.error.message);
  }
  mergeAuftraege(auftraegeByLeadRes.data as Record<string, unknown>[] | null);

  const angeboteByIdEarly = new Map<string, PortalAngebotRow>();

  // Positionen liegen als JSONB auf der Zeile — auch in der Liste laden,
  // damit HV Details/Leistungen + Preisindikation-Ablösung ohne Detail-Race greifen.
  const angebotSelectBase =
    "id, angebotsnr, lead_id, kunde_id, kunde_objekt_id, status_einfach, status, gesamt_fix, gesamt_min, gesamt_max, gueltig_bis, leistungsumfang, notizen, positionen, created_at, gesendet_am, gesendet_kunde_at, pdf_url";
  const angebotSelectWithHerkunft = `${angebotSelectBase}, herkunft`;

  async function loadAngeboteRows(filter: {
    leadIds?: string[];
    kundeId?: string;
  }): Promise<PortalAngebotRow[]> {
    const run = async (cols: string) => {
      let q = supabaseAdmin
        .from("angebote")
        .select(cols)
        .order("created_at", { ascending: false });
      if (filter.leadIds?.length) q = q.in("lead_id", filter.leadIds);
      if (filter.kundeId) q = q.eq("kunde_id", filter.kundeId);
      return q;
    };
    let { data, error } = await run(angebotSelectWithHerkunft);
    if (error && /herkunft/i.test(error.message)) {
      ({ data, error } = await run(angebotSelectBase));
    }
    if (
      error &&
      /gesamt_fix|gesamt_preis|gesendet_kunde_at|column.*status/i.test(
        error.message
      )
    ) {
      const legacy =
        "id, angebotsnr, lead_id, kunde_id, kunde_objekt_id, status_einfach, gesamt_min, gesamt_max, gueltig_bis, leistungsumfang, notizen, positionen, created_at, gesendet_am, pdf_url";
      ({ data, error } = await run(legacy));
    }
    if (error) {
      console.warn("[portal] angebote:", error.message);
      return [];
    }
    return ((data ?? []) as unknown as Array<Record<string, unknown>>).map(
      (row) => {
        const summe =
          row.gesamt_fix ?? row.gesamt_preis ?? null;
        return {
          ...(row as unknown as PortalAngebotRow),
          gesamt_preis:
            summe == null || summe === ""
              ? null
              : Number(summe),
        };
      }
    );
  }

  if (leadIds.length > 0) {
    if (onlyLeadIds.length) {
      for (const a of await loadAngeboteRows({ leadIds })) {
        angeboteByIdEarly.set(String(a.id), a);
      }
    } else {
      const [byLead, byKunde] = await Promise.all([
        loadAngeboteRows({ leadIds }),
        loadAngeboteRows({ kundeId: String(kunde.id) }),
      ]);
      for (const a of byLead) angeboteByIdEarly.set(String(a.id), a);
      for (const a of byKunde) angeboteByIdEarly.set(String(a.id), a);
    }
  } else if (!onlyLeadIds.length) {
    for (const a of await loadAngeboteRows({ kundeId: String(kunde.id) })) {
      angeboteByIdEarly.set(String(a.id), a);
    }
  }

  const angebotIds = Array.from(angeboteByIdEarly.keys());
  if (angebotIds.length > 0) {
    const { data: auftraegeByAngebot, error: aufAngErr } = await supabaseAdmin
      .from("auftraege")
      .select(auftragSelect)
      .in("angebot_id", angebotIds)
      .order("created_at", { ascending: false });
    if (aufAngErr) console.warn("[portal] auftraege angebot_id:", aufAngErr.message);
    mergeAuftraege(auftraegeByAngebot as Record<string, unknown>[] | null);
  }

  // Soft-gelöschte CRM-Vorgänge: Aufträge/Angebote mit gelöschtem Lead ausblenden
  {
    const { filterActiveLeadIds } = await import("@/lib/portal/lead-not-deleted");
    const childLeadIds: string[] = [];
    for (const row of Array.from(auftraegeById.values())) {
      const lid = String(row.lead_id ?? "").trim();
      if (lid) childLeadIds.push(lid);
    }
    for (const row of Array.from(angeboteByIdEarly.values())) {
      const lid = String((row as { lead_id?: string | null }).lead_id ?? "").trim();
      if (lid) childLeadIds.push(lid);
    }
    const activeChild = await filterActiveLeadIds(childLeadIds);
    const allowedLeads = new Set<string>([
      ...leadIds.map((id) => String(id)),
      ...Array.from(activeChild),
    ]);
    for (const [aid, row] of Array.from(auftraegeById.entries())) {
      const lid = String(row.lead_id ?? "").trim();
      if (lid && !allowedLeads.has(lid)) auftraegeById.delete(aid);
    }
    for (const [aid, row] of Array.from(angeboteByIdEarly.entries())) {
      const lid = String((row as { lead_id?: string | null }).lead_id ?? "").trim();
      if (lid && !allowedLeads.has(lid)) angeboteByIdEarly.delete(aid);
    }
  }

  const auftraege = Array.from(auftraegeById.values()).sort((a, b) => {
    const ta = new Date(String(a.created_at ?? 0)).getTime();
    const tb = new Date(String(b.created_at ?? 0)).getTime();
    return tb - ta;
  });

  const auftragIds = auftraege.map((a) => String(a.id));

  const emptyChild = { data: [] as never[], error: null as { message: string } | null };
  /** Liste: schwere Children erst im Detail. */
  const [
    { data: positionen, error: posErr },
    { data: bautagebuch, error: btErr },
    { data: abnahmeProtokolleRows, error: abnahmeErr },
    { data: milestones },
    { data: terminslots },
    { data: rechnungen },
    { data: timeline },
  ] = auftragIds.length > 0
    ? await Promise.all([
        supabaseAdmin
          .from("auftrag_positionen")
          .select(
            "id, auftrag_id, gewerk_name, leistung_name, beschreibung, leistung_status, handwerker_status, handwerker_id, menge, einheit, lohn_fix, material_fix, aenderung_typ, preis_alt, kunde_akzeptiert_at"
          )
          .in("auftrag_id", auftragIds),
        listMode
          ? Promise.resolve(emptyChild)
          : supabaseAdmin
              .from("auftrag_bautagebuch_eintraege")
              .select(
                "id, auftrag_id, datum, titel, beschreibung, foto_urls, fuer_kunde_freigegeben, eintrag_typ"
              )
              .in("auftrag_id", auftragIds)
              .neq("eintrag_typ", "befund")
              .order("datum", { ascending: false }),
        listMode
          ? Promise.resolve(emptyChild)
          : supabaseAdmin
              .from("auftrag_abnahmeprotokolle")
              .select(
                "id, auftrag_id, abnahme_datum, pdf_url, created_at, an_kunde_gesendet_at"
              )
              .in("auftrag_id", auftragIds)
              .order("created_at", { ascending: false }),
        listMode
          ? Promise.resolve(emptyChild)
          : supabaseAdmin
              .from("auftrag_milestones")
              .select("id, auftrag_id, titel, erledigt, fuer_kunden_sichtbar, sort_order")
              .in("auftrag_id", auftragIds)
              .eq("fuer_kunden_sichtbar", true)
              .order("sort_order", { ascending: true }),
        supabaseAdmin
          .from("auftrag_terminslots")
          .select("id, auftrag_id, slot_beginn, slot_ende, status, bestaetigt_am")
          .in("auftrag_id", auftragIds)
          .in("status", ["vorgeschlagen", "bestaetigt"])
          .order("slot_beginn", { ascending: true }),
        listMode
          ? Promise.resolve(emptyChild)
          : supabaseAdmin
              .from("rechnungen")
              .select(
                "id, auftrag_id, rechnungsnummer, pdf_url, status, rechnungsdatum, gesendet_at, faellig_am, created_at, updated_at, brutto, netto, rechnung_art, abschlag_index, bezahlt_at"
              )
              .in("auftrag_id", auftragIds),
        listMode
          ? Promise.resolve(emptyChild)
          : supabaseAdmin
              .from("auftrag_timeline")
              .select(
                "id, auftrag_id, titel, beschreibung, foto_urls, created_at, fuer_kunde_freigegeben"
              )
              .in("auftrag_id", auftragIds)
              .eq("fuer_kunde_freigegeben", true),
      ])
    : [
        emptyChild,
        emptyChild,
        emptyChild,
        emptyChild,
        emptyChild,
        emptyChild,
        emptyChild,
      ];

  if (posErr) console.warn("[portal] positionen:", posErr.message);
  if (btErr) console.warn("[portal] bautagebuch:", btErr.message);
  if (abnahmeErr) console.warn("[portal] auftrag_abnahmeprotokolle:", abnahmeErr.message);

  const handwerkerIds = Array.from(
    new Set(
      (positionen ?? [])
        .map((p) => String((p as { handwerker_id?: string | null }).handwerker_id ?? "").trim())
        .filter(Boolean)
    )
  );
  const handwerkerLabelById = new Map<string, string>();
  if (handwerkerIds.length > 0) {
    const { data: hwRows, error: hwErr } = await supabaseAdmin
      .from("handwerker")
      .select("id, firma, name")
      .in("id", handwerkerIds);
    if (hwErr) {
      console.warn("[portal] handwerker labels:", hwErr.message);
    } else {
      for (const row of hwRows ?? []) {
        const id = String((row as { id: string }).id);
        const label = handwerkerFirmenLabel({
          firma: (row as { firma?: string | null }).firma,
          name: (row as { name?: string | null }).name,
        });
        if (label) handwerkerLabelById.set(id, label);
      }
    }
  }

  function handwerkerLabelForAuftrag(auftragId: string): string | null {
    const labels: string[] = [];
    const seen = new Set<string>();
    for (const p of positionen ?? []) {
      if (String((p as { auftrag_id: string }).auftrag_id) !== auftragId) continue;
      const hid = String(
        (p as { handwerker_id?: string | null }).handwerker_id ?? ""
      ).trim();
      if (!hid) continue;
      const label = handwerkerLabelById.get(hid);
      if (!label || seen.has(label)) continue;
      seen.add(label);
      labels.push(label);
    }
    return labels.length ? labels.join(" · ") : null;
  }

  const abnahmeByAuftrag = new Map<
    string,
    Array<{
      id: string;
      abnahme_datum?: string | null;
      created_at?: string | null;
      pdf_href?: string | null;
      handwerker_label?: string | null;
    }>
  >();

  for (const row of abnahmeProtokolleRows ?? []) {
    const aid = String((row as { auftrag_id: string }).auftrag_id);
    const pdfHref = String((row as { pdf_url?: string }).pdf_url ?? "").trim() || null;
    const entry = {
      id: String((row as { id: string }).id),
      abnahme_datum: (row as { abnahme_datum?: string | null }).abnahme_datum ?? null,
      created_at: (row as { created_at?: string | null }).created_at ?? null,
      pdf_href: pdfHref,
      handwerker_label: null as string | null,
    };
    const list = abnahmeByAuftrag.get(aid) ?? [];
    list.push(entry);
    abnahmeByAuftrag.set(aid, list);
  }

  const leadPortalByIdEarly = new Map(
    (leads ?? []).map((lead) => [String((lead as { id: string }).id), lead])
  );
  const hvAuftragIds = new Set<string>();
  for (const a of auftraege) {
    const leadId = a.lead_id != null ? String(a.lead_id).trim() : "";
    if (!leadId) continue;
    const lead = leadPortalByIdEarly.get(leadId) as {
      auftraggeber_kunde_id?: string | null;
      anlass?: string | null;
      kanal?: string | null;
      hv_meldung_status?: string | null;
    } | undefined;
    if (lead && isHvPortalLead(lead)) {
      hvAuftragIds.add(String(a.id));
    }
  }

  const terminsByAuftrag = new Map<
    string,
    Array<{
      id: string;
      slot_beginn: string;
      slot_ende: string | null;
      status: string;
      bestaetigt_am: string | null;
    }>
  >();
  for (const row of terminslots ?? []) {
    const raw = row as {
      id: string;
      auftrag_id: string;
      slot_beginn: string;
      slot_ende: string | null;
      status: string;
      bestaetigt_am: string | null;
    };
    const aid = String(raw.auftrag_id);
    const list = terminsByAuftrag.get(aid) ?? [];
    list.push(raw);
    terminsByAuftrag.set(aid, list);
  }

  const angebote = Array.from(angeboteByIdEarly.values());

  const angeboteById = new Map(angebote.map((a) => [String(a.id), a]));

  const milestonesByAuftrag = new Map<
    string,
    Array<{ id: string; titel: string; erledigt: boolean }>
  >();
  for (const m of milestones ?? []) {
    const aid = String((m as { auftrag_id: string }).auftrag_id);
    const list = milestonesByAuftrag.get(aid) ?? [];
    list.push({
      id: String((m as { id: string }).id),
      titel: String((m as { titel: string }).titel),
      erledigt: Boolean((m as { erledigt: boolean }).erledigt),
    });
    milestonesByAuftrag.set(aid, list);
  }

  const bautagebuchByAuftrag = new Map<
    string,
    Array<{
      id: string;
      datum?: string;
      titel: string;
      notiz?: string;
      fotos_urls: string[];
    }>
  >();

  const bautagebuchVisible = (bautagebuch ?? []).filter((b) => {
    const aid = String(b.auftrag_id);
    const typ = (b.eintrag_typ ?? "tagebuch").trim();
    if (typ === "befund") return false;
    const freigegeben = Boolean(b.fuer_kunde_freigegeben);
    return freigegeben || hvAuftragIds.has(aid);
  });

  const bautagebuchSigned = listMode
    ? []
    : await Promise.all(
        bautagebuchVisible.map(async (b) => {
          const fotoRaw = b.foto_urls;
          const paths = Array.isArray(fotoRaw)
            ? (fotoRaw as string[]).map((s) => String(s).trim()).filter(Boolean)
            : [];
          const signed = await resolvePartnerFileUrls(paths);
          return {
            aid: String(b.auftrag_id),
            entry: {
              id: String(b.id),
              datum: typeof b.datum === "string" ? b.datum : undefined,
              titel: typeof b.titel === "string" ? b.titel : "Update",
              notiz:
                typeof b.beschreibung === "string" ? b.beschreibung : undefined,
              fotos_urls: signed,
            },
          };
        })
      );
  for (const { aid, entry } of bautagebuchSigned) {
    const list = bautagebuchByAuftrag.get(aid) ?? [];
    list.push(entry);
    bautagebuchByAuftrag.set(aid, list);
  }

  // Partner-Dokumentation (Positions-Lebenszyklus) → Accordion für HV/Kunde
  if (!listMode && auftragIds.length > 0) {
    const {
      loadPartnerDokumentationByAuftragIds,
      mergePortalBautagebuchEntries,
    } = await import("@/lib/portal/load-partner-dokumentation");
    const partnerDoku = await loadPartnerDokumentationByAuftragIds(auftragIds);
    for (const aid of auftragIds) {
      const legacy = bautagebuchByAuftrag.get(aid) ?? [];
      const partner = partnerDoku.get(aid) ?? [];
      if (!legacy.length && !partner.length) continue;
      bautagebuchByAuftrag.set(
        aid,
        mergePortalBautagebuchEntries(legacy, partner)
      );
    }
  }

  const betreuerIds = Array.from(
    new Set(
      auftraege
        .map((a) =>
          typeof a.betreuer_id === "string" ? a.betreuer_id.trim() : ""
        )
        .filter(Boolean)
    )
  );

  const betreuerById = new Map<string, { name: string; telefon: string | null }>();
  if (betreuerIds.length > 0) {
    const { data: betreuerRows, error: betreuerErr } = await supabaseAdmin
      .from("user_profiles")
      .select("id, name, telefon")
      .in("id", betreuerIds);
    if (betreuerErr) {
      console.warn("[portal] betreuer user_profiles:", betreuerErr.message);
    } else {
      for (const row of betreuerRows ?? []) {
        const id = String((row as { id: string }).id);
        betreuerById.set(id, {
          name: String((row as { name?: string | null }).name ?? "").trim(),
          telefon:
            typeof (row as { telefon?: string | null }).telefon === "string"
              ? (row as { telefon: string }).telefon.trim()
              : null,
        });
      }
    }
  }

  const leadPortalById = new Map(
    (leads ?? []).map((lead) => {
      const raw = lead as {
        id: string;
        kunde_objekt_id?: string | null;
        plz?: string | null;
      };
      return [
        String(raw.id),
        {
          ...lead,
          objekt: resolveObj(raw.kunde_objekt_id, raw.plz),
        },
      ];
    })
  );

  const abnahmeUrlByAuftrag = new Map<string, string>();
  if (!listMode) {
    await Promise.all(
      auftraege.map(async (a) => {
        const raw =
          typeof a.abnahme_protokoll_url === "string"
            ? a.abnahme_protokoll_url.trim()
            : "";
        if (!raw) return;
        const signed = (await resolvePartnerFileUrl(raw)) ?? raw;
        abnahmeUrlByAuftrag.set(String(a.id), signed);
      })
    );
  }

  const mappedAuftraege = auftraege.map((a) => {
      const auftragId = String(a.id);
      const angebotId =
        typeof a.angebot_id === "string" ? a.angebot_id : undefined;
      const angebot = angebotId ? angeboteById.get(angebotId) : undefined;
      const leadId =
        typeof a.lead_id === "string" ? a.lead_id : undefined;
      const objektId =
        (angebot as { kunde_objekt_id?: string | null } | undefined)
          ?.kunde_objekt_id ??
        (leadId ? leadObjektIdByLeadId.get(leadId) : null);
      const leadPlz = leadId ? leadPlzByLeadId.get(leadId) : null;

      const auftragRechnungen = (rechnungen ?? [])
        .filter((r) => String(r.auftrag_id) === auftragId)
        .map((r) => {
          const base = mapPortalRechnungForResolver(r);
          const bruttoRaw = (r as { brutto?: number | null }).brutto;
          const brutto =
            typeof bruttoRaw === "number"
              ? bruttoRaw
              : Number(bruttoRaw);
          return {
            ...base,
            brutto: Number.isFinite(brutto) ? brutto : undefined,
            rechnung_art:
              typeof (r as { rechnung_art?: string | null }).rechnung_art ===
              "string"
                ? (r as { rechnung_art: string }).rechnung_art
                : null,
            abschlag_index:
              typeof (r as { abschlag_index?: number | null }).abschlag_index ===
              "number"
                ? (r as { abschlag_index: number }).abschlag_index
                : null,
            bezahlt_at:
              typeof (r as { bezahlt_at?: string | null }).bezahlt_at ===
              "string"
                ? (r as { bezahlt_at: string }).bezahlt_at
                : null,
          };
        });
      const linkedLead = leadId ? leadPortalById.get(leadId) ?? null : null;
      const betreuerId =
        typeof a.betreuer_id === "string" ? a.betreuer_id.trim() : "";
      const betreuer = betreuerId ? betreuerById.get(betreuerId) : null;
      const roherTitel = typeof a.titel === "string" ? a.titel : "Auftrag";
      const titel = resolvePrivatPortalTitel(roherTitel, {
        privat: true,
        nameCandidates: [
          kunde.name as string | null | undefined,
          linkedLead?.kontakt_name,
        ],
      });

      return {
        ...a,
        id: auftragId,
        lead_id: leadId,
        angebot_id: angebotId,
        linkedLead,
        ansprechpartner: resolvePortalAnsprechpartner(betreuer),
        handwerkerLabel: handwerkerLabelForAuftrag(auftragId),
        titel,
        status: typeof a.status === "string" ? a.status : undefined,
        fortschritt:
          typeof a.fortschritt === "number" ? a.fortschritt : undefined,
        objekt: resolveObj(objektId, leadPlz),
        dokumente: dokumenteFromAuftrag(
          {
            id: auftragId,
            abnahme_protokoll_url:
              abnahmeUrlByAuftrag.get(auftragId) ??
              (typeof a.abnahme_protokoll_url === "string"
                ? a.abnahme_protokoll_url
                : null),
            abnahme_datum:
              typeof a.abnahme_datum === "string" ? a.abnahme_datum : null,
            abschlussdokumentation_url:
              typeof a.abschlussdokumentation_url === "string"
                ? a.abschlussdokumentation_url
                : null,
            abschlussdokumentation_gesendet_at:
              typeof a.abschlussdokumentation_gesendet_at === "string"
                ? a.abschlussdokumentation_gesendet_at
                : null,
            versicherungsakte_pdf_url:
              typeof a.versicherungsakte_pdf_url === "string"
                ? a.versicherungsakte_pdf_url
                : null,
            updated_at:
              typeof a.updated_at === "string" ? a.updated_at : null,
            created_at:
              typeof a.created_at === "string" ? a.created_at : null,
          },
          {
            angebot: angebot ?? null,
            rechnungen: (rechnungen ?? []).filter(
              (r) => String(r.auftrag_id) === auftragId
            ),
            timeline: (timeline ?? []).filter(
              (t) => String(t.auftrag_id) === auftragId
            ),
            abnahmeProtokolle: abnahmeByAuftrag.get(auftragId) ?? [],
          }
        ),
        positionen: (positionen ?? [])
          .filter((p) => String(p.auftrag_id) === String(a.id))
          .map((p) => ({
            id: String(p.id),
            gewerk_name: p.gewerk_name,
            leistung_name: p.leistung_name,
            beschreibung: p.beschreibung,
            menge: p.menge,
            lohn_fix: p.lohn_fix,
            material_fix: p.material_fix,
            aenderung_typ: p.aenderung_typ,
            preis_alt: p.preis_alt,
            kunde_akzeptiert_at: p.kunde_akzeptiert_at,
            leistung_status: p.leistung_status,
            handwerker_status: p.handwerker_status,
            handwerker_id: p.handwerker_id,
          })),
        angebotPositionenRaw: angebot?.positionen,
        bautagebuch: bautagebuchByAuftrag.get(auftragId) ?? [],
        milestones: milestonesByAuftrag.get(auftragId) ?? [],
        terminSlots: (terminsByAuftrag.get(auftragId) ?? []).map((s) => ({
          id: String(s.id),
          slot_beginn: s.slot_beginn,
          slot_ende: s.slot_ende,
          status: s.status,
          bestaetigt_am: s.bestaetigt_am,
        })),
        rechnungen: auftragRechnungen,
      };
    });

  const mappedAngebote = angebote.map((a) => {
      const display = buildAngebotPortalDisplay(a);
      const leadId = a.lead_id != null ? String(a.lead_id) : null;
      const linkedLead = leadId ? leadPortalById.get(leadId) ?? null : null;
      const objektId =
        a.kunde_objekt_id ??
        (leadId ? leadObjektIdByLeadId.get(leadId) : null);
      const leadPlz = leadId ? leadPlzByLeadId.get(leadId) : null;
      const positionenDisplay = parseAngebotPositionenMitPreis(a.positionen);
      const gesamtBrutto = resolveAngebotGesamtBrutto({
        positionen: a.positionen,
        gesamt_fix: a.gesamt_preis,
        gesamt_min: a.gesamt_min,
        gesamt_max: a.gesamt_max,
      });
      const titel = resolvePrivatPortalTitel(display.titel, {
        privat: true,
        nameCandidates: [
          kunde.name as string | null | undefined,
          linkedLead?.kontakt_name,
        ],
      });
      return {
        ...a,
        titel,
        leistungen: display.leistungen,
        hinweise: display.hinweise,
        positionenDisplay,
        gesamtBrutto,
        herkunft: (a as PortalAngebotRow).herkunft ?? null,
        linkedLead,
        objekt: resolveObj(objektId, leadPlz),
        betrag: gesamtBrutto,
        dokumente: dokumenteFromAngebot({
          id: String(a.id),
          angebotsnr: a.angebotsnr,
          angebotstitel: display.titel,
          pdf_url: a.pdf_url,
          gesendet_am: a.gesendet_am ?? a.gesendet_kunde_at,
          status_einfach: a.status_einfach ?? a.status,
          created_at: a.created_at,
        }),
      };
    });

  const mappedLeads = (leads ?? []).map((lead) => {
      const raw = lead as {
        kunde_objekt_id?: string | null;
        plz?: string | null;
      };
      return {
        ...lead,
        objekt: resolveObj(raw.kunde_objekt_id, raw.plz),
        dokumente: listMode
          ? []
          : dokumenteFromUrls(
              extractLeadDokumentUrls(
                lead as { funnel_daten?: unknown; kontakt_nachricht?: unknown }
              )
            ),
      };
    });

  const split = splitKundePortalPipeline({
    leads: mappedLeads.map((l) => ({
      id: String(l.id),
      status: (l as { status?: string }).status,
    })),
    angebote: mappedAngebote.map((a) => ({
      id: String(a.id),
      lead_id: a.lead_id != null ? String(a.lead_id) : null,
    })),
    auftraege: mappedAuftraege.map((a) => ({
      id: String(a.id),
      lead_id: a.lead_id,
      angebot_id: a.angebot_id,
      status: a.status,
      fortschritt:
        typeof a.fortschritt === "number" ? a.fortschritt : null,
    })),
  });

  const feedbackLeadIds = mappedLeads
    .map((l) => String((l as { id: string }).id))
    .filter(Boolean);
  const mieterFeedbackByLeadId: Record<
    string,
    { sterne: number; freitext?: string | null }
  > = {};
  if (feedbackLeadIds.length) {
    const { data: feedbackRows } = await supabaseAdmin
      .from("mieter_feedback")
      .select("lead_id, sterne, freitext")
      .in("lead_id", feedbackLeadIds);
    for (const row of feedbackRows ?? []) {
      const lid = String((row as { lead_id: string }).lead_id);
      mieterFeedbackByLeadId[lid] = {
        sterne: Number((row as { sterne: number }).sterne),
        freitext: (row as { freitext?: string | null }).freitext ?? null,
      };
    }
  }

  return {
    kunde,
    leads: mappedLeads,
    angebote: mappedAngebote,
    auftraege: mappedAuftraege,
    mieterFeedbackByLeadId,
    /** @deprecated Nur für Abwärtskompatibilität — Pipeline-Split clientseitig. */
    splitPipeline: split,
  };
}
