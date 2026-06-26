import type { PartnerAuftragPosition } from "@/lib/partner/get-partner-data";
import { buildPartnerAuftragKonditionZeilen } from "@/lib/partner/partner-leistungen-display";
import {
  buildHwKonditionenPayload,
  buildPartnerKonditionZeilen,
  parseHwNettoInput,
  summeKonditionBrutto,
  summeKonditionNetto,
  type PartnerHwKonditionen,
} from "@/lib/partner/partner-konditionen";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function parsePartnerKonditionenEingabe(
  raw: string
):
  | { ok: true; rows: Array<{ position_id: string; hw_netto: number; hw_notiz?: string }> }
  | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) throw new Error("invalid");
    const rows = parsed
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        const r = row as Record<string, unknown>;
        const id = String(r.position_id ?? "").trim();
        const hw = parseHwNettoInput(String(r.hw_netto ?? ""));
        if (!id || hw == null) return null;
        const notiz =
          typeof r.hw_notiz === "string" ? r.hw_notiz.trim() || undefined : undefined;
        return notiz
          ? { position_id: id, hw_netto: hw, hw_notiz: notiz }
          : { position_id: id, hw_netto: hw };
      })
      .filter((r): r is { position_id: string; hw_netto: number; hw_notiz?: string } =>
        Boolean(r)
      );
    if (!rows.length) {
      return { ok: false, error: "Bitte für jede Leistung einen gültigen Netto-Preis angeben." };
    }
    return { ok: true, rows };
  } catch {
    return { ok: false, error: "Konditionen konnten nicht gelesen werden." };
  }
}

export function buildPartnerHwKonditionenFromEingabe(opts: {
  positionenRaw: unknown;
  gewerkId: string;
  eingabe: Array<{ position_id: string; hw_netto: number; hw_notiz?: string }>;
}):
  | {
      ok: true;
      konditionen: PartnerHwKonditionen;
      preisNetto: number;
      preisBrutto: number;
    }
  | { ok: false; error: string } {
  const zeilen = buildPartnerKonditionZeilen(opts.positionenRaw, {
    gewerkId: opts.gewerkId,
  });

  if (!zeilen.length) {
    return { ok: false, error: "Keine Leistungen für dieses Gewerk gefunden." };
  }

  const hwById = Object.fromEntries(opts.eingabe.map((e) => [e.position_id, e.hw_netto]));
  const notizById = Object.fromEntries(
    opts.eingabe
      .filter((e) => e.hw_notiz?.trim())
      .map((e) => [e.position_id, e.hw_notiz!.trim()])
  );
  for (const z of zeilen) {
    if (hwById[z.id] == null) {
      return {
        ok: false,
        error: `Bitte einen Preis für „${z.title}“ angeben.`,
      };
    }
  }

  const konditionen = buildHwKonditionenPayload(zeilen, hwById, notizById);
  const preisNetto = summeKonditionNetto(
    konditionen.positionen.map((p) => ({
      hwNetto: p.hw_netto,
      vorschlagNetto: p.ek_netto,
    })),
    true
  );
  const preisBrutto = summeKonditionBrutto(
    konditionen.positionen.map((p) => ({
      id: p.position_id,
      title: p.leistung,
      vorschlagNetto: p.ek_netto,
      hwNetto: p.hw_netto,
      mwstSatz: p.mwst_satz,
    })),
    true
  );

  return {
    ok: true,
    konditionen,
    preisNetto: round2(preisNetto),
    preisBrutto: round2(preisBrutto),
  };
}

/** Konditionen direkt aus Auftragspositionen (ohne Angebots-ID-Mapping). */
export function buildPartnerHwKonditionenFromAuftragEingabe(opts: {
  auftragPositionen: PartnerAuftragPosition[];
  eingabe: Array<{ position_id: string; hw_netto: number; hw_notiz?: string }>;
}):
  | {
      ok: true;
      konditionen: PartnerHwKonditionen;
      preisNetto: number;
      preisBrutto: number;
    }
  | { ok: false; error: string } {
  const zeilen = buildPartnerAuftragKonditionZeilen(opts.auftragPositionen);
  if (!zeilen.length) {
    return { ok: false, error: "Keine Leistungen für diesen Auftrag gefunden." };
  }

  const hwById = Object.fromEntries(opts.eingabe.map((e) => [e.position_id, e.hw_netto]));
  const notizById = Object.fromEntries(
    opts.eingabe
      .filter((e) => e.hw_notiz?.trim())
      .map((e) => [e.position_id, e.hw_notiz!.trim()])
  );

  for (const z of zeilen) {
    if (hwById[z.id] == null) {
      return {
        ok: false,
        error: `Bitte einen Preis für „${z.title}“ angeben.`,
      };
    }
  }

  const konditionen = buildHwKonditionenPayload(zeilen, hwById, notizById);
  const preisNetto = summeKonditionNetto(
    konditionen.positionen.map((p) => ({
      hwNetto: p.hw_netto,
      vorschlagNetto: p.ek_netto,
    })),
    true
  );
  const preisBrutto = summeKonditionBrutto(
    konditionen.positionen.map((p) => ({
      id: p.position_id,
      title: p.leistung,
      vorschlagNetto: p.ek_netto,
      hwNetto: p.hw_netto,
      mwstSatz: p.mwst_satz,
    })),
    true
  );

  return {
    ok: true,
    konditionen,
    preisNetto: round2(preisNetto),
    preisBrutto: round2(preisBrutto),
  };
}

function normalizeLeistungTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Auftrags-Positions-IDs → Angebots-Positions-IDs (gleiche Leistung / Reihenfolge). */
export function remapAuftragKonditionenEingabe(opts: {
  auftragPositionen: PartnerAuftragPosition[];
  angebotPositionenRaw: unknown;
  gewerkId?: string;
  eingabe: Array<{ position_id: string; hw_netto: number; hw_notiz?: string }>;
}):
  | { ok: true; rows: Array<{ position_id: string; hw_netto: number; hw_notiz?: string }> }
  | { ok: false; error: string } {
  const auftragZeilen = buildPartnerAuftragKonditionZeilen(opts.auftragPositionen);
  const angebotZeilen = buildPartnerKonditionZeilen(opts.angebotPositionenRaw, {
    gewerkId: opts.gewerkId,
  });
  const preisByAuftragId = new Map(opts.eingabe.map((e) => [e.position_id, e]));

  const rows: Array<{ position_id: string; hw_netto: number; hw_notiz?: string }> = [];

  for (let i = 0; i < auftragZeilen.length; i++) {
    const az = auftragZeilen[i]!;
    const eing = preisByAuftragId.get(az.id);
    if (!eing) {
      return {
        ok: false,
        error: `Bitte einen Preis für „${az.title}“ angeben.`,
      };
    }
    const angebotZ =
      angebotZeilen[i] ??
      angebotZeilen.find(
        (oz) => normalizeLeistungTitle(oz.title) === normalizeLeistungTitle(az.title)
      );
    if (!angebotZ) {
      return {
        ok: false,
        error: `Leistung „${az.title}“ konnte im Angebot nicht zugeordnet werden.`,
      };
    }
    rows.push({
      position_id: angebotZ.id,
      hw_netto: eing.hw_netto,
      ...(eing.hw_notiz ? { hw_notiz: eing.hw_notiz } : {}),
    });
  }

  if (!rows.length) {
    return { ok: false, error: "Keine Leistungen für die Preisübernahme gefunden." };
  }

  return { ok: true, rows };
}
