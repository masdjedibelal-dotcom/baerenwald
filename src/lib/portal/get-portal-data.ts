import { buildAngebotPortalDisplay } from "@/lib/portal/portal-display";
import { splitKundePortalPipeline } from "@/lib/portal/portal-pipeline";
import {
  dokumenteFromAngebot,
  dokumenteFromAuftrag,
  dokumenteFromUrls,
} from "@/lib/portal/portal-dokumente";
import {
  resolvePortalObjekt,
  type PortalObjekt,
} from "@/lib/portal/portal-objekt";
import { resolvePartnerFileUrls } from "@/lib/partner/partner-storage";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

type PortalPositionRow = {
  id: string;
  auftrag_id: string;
  gewerk_name: string | null;
  leistung_name: string | null;
  beschreibung: string | null;
  leistung_status: string | null;
};

type PortalBautagebuchRow = {
  id: string;
  auftrag_id: string;
  datum: string | null;
  titel: string | null;
  beschreibung: string | null;
  foto_urls: unknown;
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
  created_at: string | null;
  gesendet_am: string | null;
  pdf_url: string | null;
};

type PortalRechnungRow = {
  id: string;
  auftrag_id: string;
  rechnungsnummer: string | null;
  pdf_url: string | null;
  status: string | null;
  rechnungsdatum: string | null;
  gesendet_at: string | null;
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

  const { data: kunde } = await supabaseAdmin
    .from("kunden")
    .select("id, name, email, plz, ort, adresse, auth_user_id")
    .eq("id", id)
    .maybeSingle();

  if (!kunde) return null;

  const kundeRow = kunde as {
    id: string;
    name: string | null;
    adresse: string | null;
    plz: string | null;
    ort: string | null;
  };

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
      "id, situation, bereiche, status, created_at, plz, preis_min, preis_max, budget_ca, kontakt_nachricht, funnel_daten, kunde_objekt_id"
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
    "id, titel, status, fortschritt, start_datum, end_datum, abnahme_datum, abnahme_protokoll_url, naechster_schritt, created_at, lead_id, kunde_id, angebot_id, updated_at";

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

  const angebotSelect =
    "id, angebotsnr, lead_id, kunde_id, kunde_objekt_id, status_einfach, gesamt_fix, gesamt_min, gesamt_max, gueltig_bis, leistungsumfang, notizen, created_at, gesendet_am, pdf_url";

  if (leadIds.length > 0) {
    const { data: angeboteByLead, error: angLeadErr } = await supabaseAdmin
      .from("angebote")
      .select(angebotSelect)
      .in("lead_id", leadIds)
      .order("created_at", { ascending: false });
    if (angLeadErr) console.warn("[portal] angebote lead:", angLeadErr.message);
    for (const a of angeboteByLead ?? []) {
      angeboteByIdEarly.set(String((a as { id: string }).id), a as PortalAngebotRow);
    }
  }

  const { data: angeboteByKunde, error: angKundeErr } = await supabaseAdmin
    .from("angebote")
    .select(angebotSelect)
    .eq("kunde_id", kunde.id)
    .order("created_at", { ascending: false });
  if (angKundeErr) {
    console.warn("[portal] angebote kunde_id:", angKundeErr.message);
  } else {
    for (const a of angeboteByKunde ?? []) {
      angeboteByIdEarly.set(String((a as { id: string }).id), a as PortalAngebotRow);
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
            "id, auftrag_id, gewerk_name, leistung_name, beschreibung, leistung_status, menge, einheit"
          )
          .in("auftrag_id", auftragIds)
      : { data: [] as PortalPositionRow[], error: null };
  if (posErr) console.warn("[portal] positionen:", posErr.message);

  const { data: bautagebuch, error: btErr } =
    auftragIds.length > 0
      ? await supabaseAdmin
          .from("auftrag_bautagebuch_eintraege")
          .select(
            "id, auftrag_id, datum, titel, beschreibung, foto_urls, fuer_kunde_freigegeben"
          )
          .in("auftrag_id", auftragIds)
          .eq("fuer_kunde_freigegeben", true)
          .order("datum", { ascending: false })
      : { data: [] as PortalBautagebuchRow[], error: null };
  if (btErr) console.warn("[portal] bautagebuch:", btErr.message);

  const { data: milestones } =
    auftragIds.length > 0
      ? await supabaseAdmin
          .from("auftrag_milestones")
          .select("id, auftrag_id, titel, erledigt, fuer_kunden_sichtbar, sort_order")
          .in("auftrag_id", auftragIds)
          .eq("fuer_kunden_sichtbar", true)
          .order("sort_order", { ascending: true })
      : { data: [] };

  const betreuerByAuftragId = new Map<
    string,
    { name: string; email?: string; phone?: string }
  >();
  if (auftragIds.length > 0) {
    const { data: betreuerRows, error: betreuerErr } = await supabaseAdmin
      .from("auftraege")
      .select("id, betreuer_id")
      .in("id", auftragIds);
    if (betreuerErr) {
      console.warn("[portal] betreuer_id:", betreuerErr.message);
    } else {
      const profileIds = Array.from(
        new Set(
          (betreuerRows ?? [])
            .map((r) => (r as { betreuer_id?: string | null }).betreuer_id)
            .filter((id): id is string => Boolean(id?.trim()))
        )
      );
      const profileById = new Map<string, { name: string; email?: string; phone?: string }>();
      if (profileIds.length > 0) {
        const { data: profiles, error: profileErr } = await supabaseAdmin
          .from("user_profiles")
          .select("id, full_name, name, email, phone, telefon")
          .in("id", profileIds);
        if (profileErr) {
          console.warn("[portal] user_profiles betreuer:", profileErr.message);
        } else {
          for (const p of profiles ?? []) {
            const row = p as {
              id: string;
              full_name?: string | null;
              name?: string | null;
              email?: string | null;
              phone?: string | null;
              telefon?: string | null;
            };
            const name = row.full_name?.trim() || row.name?.trim() || "Bärenwald Team";
            const phone = row.phone?.trim() || row.telefon?.trim() || undefined;
            profileById.set(String(row.id), {
              name,
              email: row.email?.trim() || undefined,
              phone,
            });
          }
        }
      }
      for (const r of betreuerRows ?? []) {
        const raw = r as { id: string; betreuer_id?: string | null };
        const pid = raw.betreuer_id?.trim();
        if (!pid) continue;
        const profile = profileById.get(pid);
        if (profile) betreuerByAuftragId.set(String(raw.id), profile);
      }
    }
  }

  const angebote = Array.from(angeboteByIdEarly.values());

  const { data: rechnungen } =
    auftragIds.length > 0
      ? await supabaseAdmin
          .from("rechnungen")
          .select(
            "id, auftrag_id, rechnungsnummer, pdf_url, status, rechnungsdatum, gesendet_at"
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

      return {
        ...a,
        id: auftragId,
        lead_id: leadId,
        angebot_id: angebotId,
        titel: typeof a.titel === "string" ? a.titel : "Auftrag",
        status: typeof a.status === "string" ? a.status : undefined,
        objekt: resolveObj(objektId, leadPlz),
        dokumente: dokumenteFromAuftrag(
          {
            id: auftragId,
            abnahme_protokoll_url:
              typeof a.abnahme_protokoll_url === "string"
                ? a.abnahme_protokoll_url
                : null,
            abnahme_datum:
              typeof a.abnahme_datum === "string" ? a.abnahme_datum : null,
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
          }
        ),
        positionen: (positionen ?? [])
          .filter((p) => String(p.auftrag_id) === String(a.id))
          .map((p) => ({
            id: String(p.id),
            titel: String(p.leistung_name ?? p.gewerk_name ?? "Leistung"),
            beschreibung:
              typeof p.beschreibung === "string" ? p.beschreibung : undefined,
            status:
              typeof p.leistung_status === "string" ? p.leistung_status : undefined,
            gewerk_name:
              typeof p.gewerk_name === "string" ? p.gewerk_name : undefined,
            datum: undefined,
            fotos_urls: [],
            bautagebuch: [],
          })),
        bautagebuch: bautagebuchByAuftrag.get(auftragId) ?? [],
        milestones: milestonesByAuftrag.get(auftragId) ?? [],
        betreuer: betreuerByAuftragId.get(auftragId),
      };
    });

  const mappedAngebote = angebote.map((a) => {
      const display = buildAngebotPortalDisplay(a);
      const leadId = a.lead_id != null ? String(a.lead_id) : null;
      const objektId =
        a.kunde_objekt_id ??
        (leadId ? leadObjektIdByLeadId.get(leadId) : null);
      const leadPlz = leadId ? leadPlzByLeadId.get(leadId) : null;
      return {
        ...a,
        titel: display.titel,
        leistungen: display.leistungen,
        hinweise: display.hinweise,
        objekt: resolveObj(objektId, leadPlz),
        betrag:
          typeof a.gesamt_fix === "number"
            ? a.gesamt_fix
            : typeof a.gesamt_max === "number"
              ? a.gesamt_max
              : typeof a.gesamt_min === "number"
                ? a.gesamt_min
                : undefined,
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
    })),
  });

  const anfragenLeadIds = new Set(split.anfragenLeads.map((l) => l.id));
  const angebotIdsTab = new Set(split.angebote.map((a) => a.id));
  const auftragIdsTab = new Set(split.auftraege.map((a) => a.id));

  return {
    kunde,
    leads: mappedLeads.filter((l) => anfragenLeadIds.has(String(l.id))),
    angebote: mappedAngebote.filter((a) => angebotIdsTab.has(String(a.id))),
    auftraege: mappedAuftraege.filter((a) => auftragIdsTab.has(String(a.id))),
  };
}
