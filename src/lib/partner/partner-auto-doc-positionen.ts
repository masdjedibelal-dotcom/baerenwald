import { PARTNER_KONDITION_MWST } from "@/lib/partner/partner-konditionen";
import type { PartnerDocPosition } from "@/lib/partner/generate-partner-dokument-pdf";
import { parsePartnerHwKonditionen } from "@/lib/partner/partner-konditionen";
import { supabaseAdmin } from "@/lib/supabase";

export type AutoDocMissingField = {
  key: string;
  label: string;
  scope: "firmendaten" | "regie";
  positionId?: string;
  /** Input hint for UI */
  kind?: "text" | "iban" | "tel" | "number" | "textarea";
};

export type AutoDocRegieGap = {
  positionId: string;
  leistungName: string;
  stundensatz: number | null;
  zeitMinuten: number;
  needsZeit: boolean;
  needsStundensatz: boolean;
  needsTitel: boolean;
  beschreibung: string;
};

export type AutoDocRegieOverride = {
  positionId: string;
  titel?: string;
  beschreibung?: string;
  zeitMinuten?: number;
  stundensatz?: number;
};

function isRegiePos(p: {
  typ?: string | null;
  verguetung?: string | null;
}): boolean {
  const typ = String(p.typ ?? "").toLowerCase();
  const verg = String(p.verguetung ?? "").toLowerCase();
  return typ === "regie" || verg === "aufwand";
}

function aggregateBeschreibung(
  eintraege: Array<{
    position_id?: string | null;
    beschreibung?: string | null;
    zeit_minuten?: number | null;
    created_at?: string | null;
  }>
): Map<string, { text: string; zeit: number }> {
  const byPos = new Map<string, { lines: string[]; zeit: number }>();
  const sorted = [...eintraege].sort((a, b) =>
    String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""))
  );
  for (const e of sorted) {
    const pid = String(e.position_id ?? "").trim();
    if (!pid) continue;
    const cur = byPos.get(pid) ?? { lines: [], zeit: 0 };
    const zeit = Number(e.zeit_minuten) || 0;
    cur.zeit += zeit;
    const text = e.beschreibung?.trim();
    if (text) {
      const zeitLabel =
        zeit > 0
          ? ` (${Math.floor(zeit / 60)}:${String(zeit % 60).padStart(2, "0")} Std.)`
          : "";
      cur.lines.push(`• ${text}${zeitLabel}`);
    }
    byPos.set(pid, cur);
  }
  const out = new Map<string, { text: string; zeit: number }>();
  for (const [pid, v] of Array.from(byPos.entries())) {
    out.set(pid, { text: v.lines.join("\n"), zeit: v.zeit });
  }
  return out;
}

/**
 * Positionen für Auto-Angebot/Rechnung.
 * Festpreis aus hw_konditionen bzw. preis_partner am Auftrag;
 * Regie = Zeit × Stundensatz (Titel/Beschreibung aus Position/Einträgen).
 */
export async function buildPartnerAutoDocPositionen(opts: {
  handwerkerId: string;
  angebotId?: string | null;
  /** Direktauftrag: Positionen ohne Umweg über Angebot laden. */
  auftragId?: string | null;
  hwKonditionen?: unknown;
  art: "angebot" | "rechnung";
  overrides?: AutoDocRegieOverride[];
}): Promise<{
  positionen: PartnerDocPosition[];
  regieGaps: AutoDocRegieGap[];
  missingRegie: AutoDocMissingField[];
}> {
  const overrideById = new Map(
    (opts.overrides ?? []).map((o) => [o.positionId, o] as const)
  );

  const kond = parsePartnerHwKonditionen(opts.hwKonditionen);
  const kondPos = kond?.positionen ?? [];

  let auftragId = opts.auftragId?.trim() || null;
  if (!auftragId && opts.angebotId) {
    const { data: auf } = await supabaseAdmin
      .from("auftraege")
      .select("id")
      .eq("angebot_id", opts.angebotId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    auftragId = auf?.id ? String(auf.id) : null;
  }

  type PosRow = {
    id: string;
    leistung_name: string | null;
    beschreibung: string | null;
    typ: string | null;
    verguetung: string | null;
    stundensatz: number | null;
    preis_partner: number | null;
    menge: number | null;
    einheit: string | null;
    zeit_minuten_summe: number | null;
  };

  let auftragPos: PosRow[] = [];
  if (auftragId) {
    const { data, error: posErr } = await supabaseAdmin
      .from("auftrag_positionen")
      .select(
        "id, leistung_name, typ, verguetung, stundensatz, preis_partner, menge, einheit"
      )
      .eq("auftrag_id", auftragId)
      .eq("handwerker_id", opts.handwerkerId);
    if (posErr) {
      console.warn("[partner] auto-doc positionen:", posErr.message);
    }
    auftragPos = ((data ?? []) as Array<Record<string, unknown>>).map((p) => ({
      id: String(p.id),
      leistung_name: (p.leistung_name as string | null) ?? null,
      beschreibung: null,
      typ: (p.typ as string | null) ?? null,
      verguetung: (p.verguetung as string | null) ?? null,
      stundensatz: p.stundensatz != null ? Number(p.stundensatz) : null,
      preis_partner: p.preis_partner != null ? Number(p.preis_partner) : null,
      menge: p.menge != null ? Number(p.menge) : null,
      einheit: (p.einheit as string | null) ?? null,
      // Spalte zeit_minuten_summe existiert nicht überall — Zeit kommt aus position_eintraege.
      zeit_minuten_summe: null,
    }));
  }

  const eintragAgg = new Map<string, { text: string; zeit: number }>();
  if (auftragPos.length) {
    const ids = auftragPos.map((p) => p.id);
    const { data: eintraege } = await supabaseAdmin
      .from("position_eintraege")
      .select("position_id, beschreibung, zeit_minuten, created_at")
      .in("position_id", ids);
    const agg = aggregateBeschreibung(
      (eintraege ?? []) as Array<{
        position_id?: string | null;
        beschreibung?: string | null;
        zeit_minuten?: number | null;
        created_at?: string | null;
      }>
    );
    for (const [pid, v] of Array.from(agg.entries())) {
      eintragAgg.set(pid, v);
    }
  }

  const positionen: PartnerDocPosition[] = [];
  const regieGaps: AutoDocRegieGap[] = [];
  const missingRegie: AutoDocMissingField[] = [];

  if (auftragPos.length) {
    for (const p of auftragPos) {
      const ov = overrideById.get(p.id);
      const name =
        ov?.titel?.trim() ||
        String(p.leistung_name ?? "").trim() ||
        "Leistung";
      const agg = eintragAgg.get(p.id);
      const zeitFromSum = Number(p.zeit_minuten_summe) || 0;
      const zeitFromEin = agg?.zeit ?? 0;
      const zeitMin = ov?.zeitMinuten ?? Math.max(zeitFromSum, zeitFromEin);
      const rawSatz = Number(ov?.stundensatz ?? p.stundensatz) || 0;
      const stundensatz = rawSatz > 0 ? rawSatz : null;
      const beschreibung =
        ov?.beschreibung?.trim() ||
        agg?.text ||
        String(p.beschreibung ?? "").trim() ||
        "";

      if (isRegiePos(p)) {
        const needsZeit = opts.art === "rechnung" && zeitMin <= 0;
        const needsStundensatz = !stundensatz || stundensatz <= 0;
        const needsTitel = !name.trim();
        regieGaps.push({
          positionId: p.id,
          leistungName: name,
          stundensatz,
          zeitMinuten: zeitMin,
          needsZeit,
          needsStundensatz,
          needsTitel,
          beschreibung,
        });
        if (needsTitel) {
          missingRegie.push({
            key: `regie_titel_${p.id}`,
            label: `Titel Regie: ${name || "Position"}`,
            scope: "regie",
            positionId: p.id,
            kind: "text",
          });
        }
        if (needsStundensatz) {
          missingRegie.push({
            key: `regie_satz_${p.id}`,
            label: `Stundensatz (€) für „${name}"`,
            scope: "regie",
            positionId: p.id,
            kind: "number",
          });
        }
        if (needsZeit) {
          missingRegie.push({
            key: `regie_zeit_${p.id}`,
            label: `Erfasste Zeit (Minuten) für „${name}"`,
            scope: "regie",
            positionId: p.id,
            kind: "number",
          });
        }

        const satz = stundensatz ?? 0;
        const menge =
          zeitMin > 0 ? Math.round((zeitMin / 60) * 100) / 100 : 0;
        const netto =
          menge > 0 && satz > 0
            ? Math.round(menge * satz * 100) / 100
            : 0;

        positionen.push({
          titel: name.startsWith("Regie") ? name : `Regie — ${name}`,
          beschreibung: beschreibung || null,
          menge: menge || null,
          einheit: menge ? "Std" : null,
          netto,
          mwstSatz: PARTNER_KONDITION_MWST,
        });
      } else {
        const kondMatch = kondPos.find(
          (k) =>
            k.position_id === p.id ||
            k.leistung.trim().toLowerCase() === name.toLowerCase()
        );
        const netto =
          kondMatch?.hw_netto ??
          (Number(p.preis_partner) || 0);
        positionen.push({
          titel: name,
          beschreibung: beschreibung || kondMatch?.beschreibung || null,
          menge: p.menge,
          einheit: p.einheit,
          netto,
          mwstSatz: kondMatch?.mwst_satz || PARTNER_KONDITION_MWST,
        });
      }
    }
  } else if (kondPos.length) {
    for (const k of kondPos) {
      positionen.push({
        titel: k.leistung,
        beschreibung: k.beschreibung ?? null,
        netto: k.hw_netto,
        mwstSatz: k.mwst_satz || PARTNER_KONDITION_MWST,
      });
    }
  }

  return { positionen, regieGaps, missingRegie };
}
