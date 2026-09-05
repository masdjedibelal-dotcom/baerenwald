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

function sumZeitForTyp(
  eintraege: Array<{ typ?: string | null; zeit_minuten?: number | null }>,
  typ: string
): number {
  const t = typ.toLowerCase();
  return eintraege.reduce((sum, e) => {
    if (String(e.typ ?? "").toLowerCase() !== t) return sum;
    return sum + (Number(e.zeit_minuten) || 0);
  }, 0);
}

/**
 * Tatsächliche Zeit (Ergebnis) vor Schätzung (Anmeldung/Menge).
 * Kein Aufsummieren von Schätzung + Erledigt.
 */
function resolveRegieZeitMinuten(
  eintraege: Array<{ typ?: string | null; zeit_minuten?: number | null }>,
  mengeStd: number | null | undefined
): number {
  const ergebnis = sumZeitForTyp(eintraege, "ergebnis");
  if (ergebnis > 0) return ergebnis;
  const fortschritt = sumZeitForTyp(eintraege, "fortschritt");
  if (fortschritt > 0) return fortschritt;
  const schaetzung = sumZeitForTyp(eintraege, "weitere_arbeit");
  if (schaetzung > 0) return schaetzung;
  const menge = Number(mengeStd) || 0;
  if (menge > 0) return Math.round(menge * 60);
  return 0;
}

/** Stundensatz: Spalte stundensatz, sonst preis_partner bei Std/h (Legacy). */
function resolveRegieStundensatz(opts: {
  override?: number | null;
  stundensatz: number | null;
  preisPartner: number | null;
  einheit: string | null;
}): number {
  const fromOv = Number(opts.override) || 0;
  if (fromOv > 0) return fromOv;
  const fromCol = Number(opts.stundensatz) || 0;
  if (fromCol > 0) return fromCol;
  const einheit = String(opts.einheit ?? "").toLowerCase();
  const fromPreis = Number(opts.preisPartner) || 0;
  if (
    fromPreis > 0 &&
    (einheit === "std" || einheit === "h" || einheit === "stunden" || !einheit)
  ) {
    return fromPreis;
  }
  return 0;
}

function beschreibungAusEintraegen(
  eintraege: Array<{
    beschreibung?: string | null;
    zeit_minuten?: number | null;
    created_at?: string | null;
  }>
): string {
  const sorted = [...eintraege].sort((a, b) =>
    String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""))
  );
  const lines: string[] = [];
  for (const e of sorted) {
    const text = e.beschreibung?.trim();
    if (!text) continue;
    const zeit = Number(e.zeit_minuten) || 0;
    const zeitLabel =
      zeit > 0
        ? ` (${Math.floor(zeit / 60)}:${String(zeit % 60).padStart(2, "0")} Std.)`
        : "";
    lines.push(`• ${text}${zeitLabel}`);
  }
  return lines.join("\n");
}

/**
 * Positionen für Auto-Angebot/Rechnung.
 * Festpreis aus hw_konditionen bzw. preis_partner am Auftrag;
 * Regie = erfasste Zeit × Stundensatz (bereits bei Anmeldung + Erledigt gesetzt — keine erneute Abfrage).
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
  };

  let auftragPos: PosRow[] = [];
  if (auftragId) {
    const { data, error: posErr } = await supabaseAdmin
      .from("auftrag_positionen")
      .select(
        "id, leistung_name, beschreibung, typ, verguetung, stundensatz, preis_partner, menge, einheit"
      )
      .eq("auftrag_id", auftragId)
      .eq("handwerker_id", opts.handwerkerId);
    if (posErr) {
      console.warn("[partner] auto-doc positionen:", posErr.message);
    }
    auftragPos = ((data ?? []) as Array<Record<string, unknown>>).map((p) => ({
      id: String(p.id),
      leistung_name: (p.leistung_name as string | null) ?? null,
      beschreibung: (p.beschreibung as string | null) ?? null,
      typ: (p.typ as string | null) ?? null,
      verguetung: (p.verguetung as string | null) ?? null,
      stundensatz: p.stundensatz != null ? Number(p.stundensatz) : null,
      preis_partner: p.preis_partner != null ? Number(p.preis_partner) : null,
      menge: p.menge != null ? Number(p.menge) : null,
      einheit: (p.einheit as string | null) ?? null,
    }));
  }

  type EintragRow = {
    position_id?: string | null;
    typ?: string | null;
    beschreibung?: string | null;
    zeit_minuten?: number | null;
    created_at?: string | null;
  };

  const eintraegeByPos = new Map<string, EintragRow[]>();
  if (auftragPos.length) {
    const ids = auftragPos.map((p) => p.id);
    const { data: eintraege } = await supabaseAdmin
      .from("position_eintraege")
      .select("position_id, typ, beschreibung, zeit_minuten, created_at")
      .in("position_id", ids);
    for (const e of (eintraege ?? []) as EintragRow[]) {
      const pid = String(e.position_id ?? "").trim();
      if (!pid) continue;
      const list = eintraegeByPos.get(pid) ?? [];
      list.push(e);
      eintraegeByPos.set(pid, list);
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
      const entries = eintraegeByPos.get(p.id) ?? [];
      const beschreibungAgg = beschreibungAusEintraegen(entries);
      const zeitMin =
        ov?.zeitMinuten != null && ov.zeitMinuten > 0
          ? ov.zeitMinuten
          : resolveRegieZeitMinuten(entries, p.menge);
      const satzResolved = resolveRegieStundensatz({
        override: ov?.stundensatz,
        stundensatz: p.stundensatz,
        preisPartner: p.preis_partner,
        einheit: p.einheit,
      });
      const stundensatz =
        satzResolved > 0
          ? satzResolved
          : null;
      const beschreibung =
        ov?.beschreibung?.trim() ||
        beschreibungAgg ||
        String(p.beschreibung ?? "").trim() ||
        "";

      if (isRegiePos(p)) {
        const needsZeit = zeitMin <= 0;
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

        // Rechnung: Stundensatz + Zeit kommen aus Anmeldung bzw. Erledigt —
        // keine erneute Abfrage im Auto-Rechnungs-Dialog.
        // Angebot: nur Titel nachziehen, falls leer.
        if (opts.art !== "rechnung") {
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
