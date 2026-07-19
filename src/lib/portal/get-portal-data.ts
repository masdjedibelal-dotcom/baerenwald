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
};

type PortalAngebotRow = {
  id: string;
  angebotsnr: string | null;
  lead_id: string | null;
  kunde_objekt_id: string | null;
  status_einfach: string | null;
  gesamt_fix: number | null;
  gesamt_min: number | null;
  gesamt_max: number | null;
  gueltig_bis: string | null;
  leistungsumfang: string | null;
  notizen: string | null;
  positionen: unknown;
  created_at: string | null;
  gesendet_am: string | null;
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

export async function getPortalDataForKunde(kundeId: string) {
  if (!isSupabaseConfigured()) return null;

  const id = kundeId.trim();
  if (!id) return null;

  const { data: kundePrimary, error: kundePrimaryErr } = await supabaseAdmin
    .from("kunden")
    .select(
      "id, name, email, plz, ort, adresse, auth_user_id, portal_modus, freigabe_schwelle_eur, typ"
    )
    .eq("id", id)
    .maybeSingle();

  let kundeRow = (!kundePrimaryErr ? kundePrimary : null) as {
    id: string;
    name?: string | null;
    email?: string | null;
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

  if (!kundeRow) return null;

  const kunde = kundeRow;

  const { data: objekteRows } = await supabaseAdmin
    .from("kunden_objekte")
    .select("id, titel, strasse, hausnummer, plz, ort")
    .eq("kunde_id", kundeRow.id)
    .order("titel", { ascending: true });

  const objektById = new Map<string, PortalKundenObjektRow>();
  for (const o of objekteRows ?? []) {
    objektById.set(String((o as { id: string }).id), o as PortalKundenObjektRow);
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

  const { data: leads } = await supabaseAdmin
    .from("leads")
    .select(
      "id, situation, bereiche, status, vorgang_phase, created_at, plz, strasse, hausnummer, zeitraum, kontakt_name, preis_min, preis_max, budget_ca, kontakt_nachricht, funnel_daten, kunde_objekt_id, anlass, kanal, auftraggeber_kunde_id, hv_meldung_status, org_freigabe_status, melde_tracking_token"
    )
    .eq("kunde_id", kunde.id)
    .order("created_at", { ascending: false });

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
    "id, titel, status, fortschritt, start_datum, end_datum, abnahme_datum, abnahme_protokoll_url, abschlussdokumentation_url, abschlussdokumentation_gesendet_at, created_at, lead_id, kunde_id, angebot_id, betreuer_id, updated_at";

  const mergeAuftraege = (
    rows: Array<Record<string, unknown>> | null | undefined
  ) => {
    for (const row of rows ?? []) {
      auftraegeById.set(String(row.id), row);
    }
  };

  const auftraegeById = new Map<string, Record<string, unknown>>();

  const { data: auftraegeByKunde, error: aufKundeErr } = await supabaseAdmin
    .from("auftraege")
    .select(auftragSelect)
    .eq("kunde_id", kunde.id)
    .order("created_at", { ascending: false });
  if (aufKundeErr) console.warn("[portal] auftraege kunde_id:", aufKundeErr.message);
  mergeAuftraege(auftraegeByKunde as Record<string, unknown>[] | null);

  if (leadIds.length > 0) {
    const { data: auftraegeByLead, error: aufLeadErr } = await supabaseAdmin
      .from("auftraege")
      .select(auftragSelect)
      .in("lead_id", leadIds)
      .order("created_at", { ascending: false });
    if (aufLeadErr) console.warn("[portal] auftraege lead_id:", aufLeadErr.message);
    mergeAuftraege(auftraegeByLead as Record<string, unknown>[] | null);
  }

  const angeboteByIdEarly = new Map<string, PortalAngebotRow>();

  const angebotSelectBase =
    "id, angebotsnr, lead_id, kunde_id, kunde_objekt_id, status_einfach, gesamt_preis, gesamt_min, gesamt_max, gueltig_bis, leistungsumfang, notizen, positionen, created_at, gesendet_am, pdf_url";
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
    if (error) {
      console.warn("[portal] angebote:", error.message);
      return [];
    }
    return (data ?? []) as unknown as PortalAngebotRow[];
  }

  if (leadIds.length > 0) {
    for (const a of await loadAngeboteRows({ leadIds })) {
      angeboteByIdEarly.set(String(a.id), a);
    }
  }

  for (const a of await loadAngeboteRows({ kundeId: String(kunde.id) })) {
    angeboteByIdEarly.set(String(a.id), a);
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

  const auftraege = Array.from(auftraegeById.values()).sort((a, b) => {
    const ta = new Date(String(a.created_at ?? 0)).getTime();
    const tb = new Date(String(b.created_at ?? 0)).getTime();
    return tb - ta;
  });

  const auftragIds = auftraege.map((a) => String(a.id));

  const { data: positionen, error: posErr } =
    auftragIds.length > 0
      ? await supabaseAdmin
          .from("auftrag_positionen")
          .select(
            "id, auftrag_id, gewerk_name, leistung_name, beschreibung, leistung_status, handwerker_status, handwerker_id, menge, einheit, lohn_fix, material_fix, aenderung_typ, preis_alt, kunde_akzeptiert_at"
          )
          .in("auftrag_id", auftragIds)
      : { data: [] as PortalPositionRow[], error: null };
  if (posErr) console.warn("[portal] positionen:", posErr.message);

  const { data: bautagebuch, error: btErr } =
    auftragIds.length > 0
      ? await supabaseAdmin
          .from("auftrag_bautagebuch_eintraege")
          .select(
            "id, auftrag_id, datum, titel, beschreibung, foto_urls, fuer_kunde_freigegeben, eintrag_typ"
          )
          .in("auftrag_id", auftragIds)
          .neq("eintrag_typ", "befund")
          .order("datum", { ascending: false })
      : { data: [] as PortalBautagebuchRow[], error: null };
  if (btErr) console.warn("[portal] bautagebuch:", btErr.message);

  const { data: abnahmeProtokolleRows, error: abnahmeErr } =
    auftragIds.length > 0
      ? await supabaseAdmin
          .from("abnahme_protokolle")
          .select(
            "id, auftrag_id, handwerker_id, abnahme_datum, pdf_path, created_at, handwerker:handwerker_id(name, firma)"
          )
          .in("auftrag_id", auftragIds)
          .order("created_at", { ascending: false })
      : { data: [] as Record<string, unknown>[], error: null };
  if (abnahmeErr) console.warn("[portal] abnahme_protokolle:", abnahmeErr.message);

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
    const pdfPath = String((row as { pdf_path?: string }).pdf_path ?? "").trim();
    const pdfHref = pdfPath ? await resolvePartnerFileUrl(pdfPath) : null;
    const hw = (row as { handwerker?: { name?: string; firma?: string } | null })
      .handwerker;
    const handwerkerLabel =
      hw?.firma?.trim() || hw?.name?.trim() || null;
    const entry = {
      id: String((row as { id: string }).id),
      abnahme_datum: (row as { abnahme_datum?: string | null }).abnahme_datum ?? null,
      created_at: (row as { created_at?: string | null }).created_at ?? null,
      pdf_href: pdfHref,
      handwerker_label: handwerkerLabel,
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

  const { data: milestones } =
    auftragIds.length > 0
      ? await supabaseAdmin
          .from("auftrag_milestones")
          .select("id, auftrag_id, titel, erledigt, fuer_kunden_sichtbar, sort_order")
          .in("auftrag_id", auftragIds)
          .eq("fuer_kunden_sichtbar", true)
          .order("sort_order", { ascending: true })
      : { data: [] };

  const { data: terminslots } =
    auftragIds.length > 0
      ? await supabaseAdmin
          .from("auftrag_terminslots")
          .select("id, auftrag_id, slot_beginn, slot_ende, status, bestaetigt_am")
          .in("auftrag_id", auftragIds)
          .in("status", ["vorgeschlagen", "bestaetigt"])
          .order("slot_beginn", { ascending: true })
      : { data: [] };

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

  const { data: rechnungen } =
    auftragIds.length > 0
      ? await supabaseAdmin
          .from("rechnungen")
          .select(
            "id, auftrag_id, rechnungsnummer, pdf_url, status, rechnungsdatum, gesendet_at, faellig_am, created_at, updated_at"
          )
          .in("auftrag_id", auftragIds)
      : { data: [] as PortalRechnungRow[] };

  const { data: timeline } =
    auftragIds.length > 0
      ? await supabaseAdmin
          .from("auftrag_timeline")
          .select(
            "id, auftrag_id, titel, beschreibung, foto_urls, created_at, fuer_kunde_freigegeben"
          )
          .in("auftrag_id", auftragIds)
          .eq("fuer_kunde_freigegeben", true)
      : { data: [] as PortalTimelineRow[] };

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

  for (const b of bautagebuch ?? []) {
    const aid = String(b.auftrag_id);
    const typ = (b.eintrag_typ ?? "tagebuch").trim();
    if (typ === "befund") continue;
    const freigegeben = Boolean(b.fuer_kunde_freigegeben);
    if (!freigegeben && !hvAuftragIds.has(aid)) continue;

    const fotoRaw = b.foto_urls;
    const paths = Array.isArray(fotoRaw)
      ? (fotoRaw as string[]).map((s) => String(s).trim()).filter(Boolean)
      : [];
    const signed = await resolvePartnerFileUrls(paths);
    const entry = {
      id: String(b.id),
      datum: typeof b.datum === "string" ? b.datum : undefined,
      titel: typeof b.titel === "string" ? b.titel : "Update",
      notiz: typeof b.beschreibung === "string" ? b.beschreibung : undefined,
      fotos_urls: signed,
    };
    const list = bautagebuchByAuftrag.get(aid) ?? [];
    list.push(entry);
    bautagebuchByAuftrag.set(aid, list);
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
  for (const a of auftraege) {
    const raw =
      typeof a.abnahme_protokoll_url === "string"
        ? a.abnahme_protokoll_url.trim()
        : "";
    if (!raw) continue;
    const signed = (await resolvePartnerFileUrl(raw)) ?? raw;
    abnahmeUrlByAuftrag.set(String(a.id), signed);
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

      const bautagebuchEntries = bautagebuchByAuftrag.get(auftragId) ?? [];
      const auftragRechnungen = (rechnungen ?? [])
        .filter((r) => String(r.auftrag_id) === auftragId)
        .map((r) => mapPortalRechnungForResolver(r));
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
            bautagebuch: bautagebuchEntries.map((entry) => ({
              id: entry.id,
              datum: entry.datum ?? null,
              titel: entry.titel,
              fotos_urls: entry.fotos_urls,
            })),
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
        gesamt_fix: a.gesamt_fix,
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
          gesendet_am: a.gesendet_am,
          status_einfach: a.status_einfach,
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
        dokumente: dokumenteFromUrls([
        ...extractUrlsFromUnknown(
          (lead as { funnel_daten?: unknown }).funnel_daten
        ),
        ...extractUrlsFromUnknown(
          (lead as { kontakt_nachricht?: unknown }).kontakt_nachricht
        ),
      ]),
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
