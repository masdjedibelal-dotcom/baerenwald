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
