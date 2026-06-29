import type { PartnerAuftragPosition } from "@/lib/partner/get-partner-data";
import type { PartnerAngebotPositionenFilter } from "@/lib/partner/partner-leistungen-display";

const SKIP_POSITION_SLUGS = new Set(["__freitext__", "__gesamtrabatt__"]);

/** Positionen, bei denen der Handwerker noch zu-/absagen oder Preise festlegen muss. */
const AUFTRAG_POSITION_HW_AKTION = new Set([
  "angefragt",
  "ausstehend",
  "zugewiesen",
  "warten",
  "offen",
]);

const AUFTRAG_POSITION_HW_ABGESCHLOSSEN = new Set([
  "angenommen",
  "akzeptiert",
  "uebernommen",
  "eingereicht",
  "bestaetigt",
]);

export function positionHandwerkerAbgeschlossen(
  handwerkerStatus: string | null | undefined
): boolean {
  return AUFTRAG_POSITION_HW_ABGESCHLOSSEN.has((handwerkerStatus ?? "").toLowerCase());
}

/** CRM hat die Leistung an den Handwerker gesendet (handwerker_status gesetzt). */
export function positionIstHandwerkerZugewiesen(
  handwerkerStatus: string | null | undefined
): boolean {
  return Boolean((handwerkerStatus ?? "").trim());
}

export function positionBrauchtHandwerkerAktion(
  handwerkerStatus: string | null | undefined
): boolean {
  return AUFTRAG_POSITION_HW_AKTION.has((handwerkerStatus ?? "").toLowerCase());
}

export function positionBrauchtVorgangAktion(
  position: Pick<PartnerAuftragPosition, "aenderung_typ" | "handwerker_status">
): boolean {
  if (!positionIstHandwerkerZugewiesen(position.handwerker_status)) return false;

  const typ = (position.aenderung_typ ?? "").trim().toLowerCase();
  const hwAbgeschlossen = positionHandwerkerAbgeschlossen(position.handwerker_status);

  if (hwAbgeschlossen) {
    return typ === "geaendert" || typ === "entfernt";
  }

  if (typ === "neu" || typ === "geaendert" || typ === "entfernt") return true;
  return positionBrauchtHandwerkerAktion(position.handwerker_status);
}

/** Offene Auftragspositionen (Status oder CRM-`aenderung_typ`). */
export function resolveOffeneAuftragPositionIdsByStatus(
  positionen: Array<
    Pick<
      PartnerAuftragPosition,
      "id" | "gewerk_name" | "handwerker_status" | "aenderung_typ"
    >
  >,
  filter?: PartnerNachreichungFilter
): string[] {
  const gewerkName = filter?.gewerkName?.trim() || "";
  return positionen
    .filter((p) => {
      if (!positionBrauchtVorgangAktion(p)) return false;
      if (gewerkName && p.gewerk_name?.trim() && p.gewerk_name.trim() !== gewerkName) {
        return false;
      }
      return true;
    })
    .map((p) => p.id);
}

export const PARTNER_KONDITION_MWST = 19;

export type PartnerKonditionZeile = {
  id: string;
  title: string;
  beschreibung?: string;
  /** Einkaufspreis-Vorschlag von Bärenwald (netto Zeile). null = Preis folgt */
  vorschlagNetto: number | null;
  /** Vorheriger Preis (z. B. vor neuer CRM-Runde). */
  vorherNetto?: number | null;
  /** Vom Handwerker eingereicht / vereinbart (netto Zeile). */
  hwNetto?: number | null;
  /** Optionale Notiz des Handwerkers zu dieser Leistung. */
  hwNotiz?: string;
  mwstSatz: number;
  geaendert?: boolean;
  /** Zeile nicht bearbeitbar (z. B. bereits vereinbart bei Nachreichung). */
  readonly?: boolean;
  /** Badge neben der Leistung in der Konditionen-Karte. */
  zeilenBadge?: "vereinbart" | "neu" | "geaendert" | "entfernt";
};

export type PartnerHwKonditionPosition = {
  position_id: string;
  leistung: string;
  beschreibung?: string;
  ek_netto: number | null;
  hw_netto: number;
  mwst_satz: number;
  geaendert: boolean;
  hw_notiz?: string;
};

export type PartnerHwKonditionen = {
  art: "bestaetigt" | "gegenvorschlag";
  positionen: PartnerHwKonditionPosition[];
  eingereicht_at?: string;
};

function normalizeKonditionLeistungKey(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

function positionIdFromRow(row: Record<string, unknown>, index: number): string {
  const id = String(row.id ?? row.position_id ?? "").trim();
  return id || `pos-${index}`;
}

function agreedHwPositionForZeile(
  z: PartnerKonditionZeile,
  byId: Map<string, PartnerHwKonditionPosition>,
  byTitle: Map<string, PartnerHwKonditionPosition>
): PartnerHwKonditionPosition | undefined {
  return (
    byId.get(z.id) ?? byTitle.get(normalizeKonditionLeistungKey(z.title))
  );
}

function konditionZeileFromAuftragPosition(
  p: PartnerAuftragPosition
): PartnerKonditionZeile {
  const menge = Math.max(p.menge ?? 1, 0.0001);
  let vorschlagNetto: number | null = null;
  if (p.preis_partner != null && p.preis_partner > 0) {
    vorschlagNetto = round2(p.preis_partner);
  } else {
    const parts = (num(p.lohn_fix) + num(p.material_fix)) * menge;
    if (parts > 0) vorschlagNetto = round2(parts);
  }
  return {
    id: p.id,
    title: p.leistung_name,
    beschreibung: p.beschreibung ?? undefined,
    vorschlagNetto,
    mwstSatz: PARTNER_KONDITION_MWST,
  };
}

export type PartnerNachreichungFilter = PartnerAngebotPositionenFilter & {
  gewerkName?: string;
};

/** Angebots-JSON + ggf. nur im Auftrag sichtbare Leistungen (CRM-Nachreichung). */
export function buildNachreichungKonditionZeilen(
  angebotPositionenRaw: unknown,
  auftragPositionen: PartnerAuftragPosition[] | undefined,
  filter: PartnerNachreichungFilter
): PartnerKonditionZeile[] {
  const fromAngebot = buildPartnerKonditionZeilen(angebotPositionenRaw, {
    gewerkId: filter.gewerkId,
    handwerkerId: filter.handwerkerId,
  });
  if (!auftragPositionen?.length) return fromAngebot;

  const knownIds = new Set(fromAngebot.map((z) => z.id));
  const knownTitles = new Set(
    fromAngebot.map((z) => normalizeKonditionLeistungKey(z.title))
  );

  /** Alle HW-Positionen am Auftrag — nicht nach Gewerk filtern (Multi-Gewerk / eine AH-Zeile). */
  const extra: PartnerKonditionZeile[] = [];
  for (const ap of auftragPositionen) {
    if (!positionIstHandwerkerZugewiesen(ap.handwerker_status)) continue;
    const titleKey = normalizeKonditionLeistungKey(ap.leistung_name);
    if (knownIds.has(ap.id) || knownTitles.has(titleKey)) continue;
    extra.push(konditionZeileFromAuftragPosition(ap));
    knownIds.add(ap.id);
    knownTitles.add(titleKey);
  }
  return [...fromAngebot, ...extra];
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function resolveMwstSatz(raw: Record<string, unknown>): number {
  const mwst = num(raw.mwst_satz);
  if (mwst === 0 || mwst === 7 || mwst === 19) return mwst;
  return PARTNER_KONDITION_MWST;
}

function positionTitle(raw: Record<string, unknown>): string {
  const leistung = String(raw.leistung ?? raw.leistung_name ?? "").trim();
  if (leistung) return leistung;
  return String(raw.gewerk_name ?? "Leistung").trim() || "Leistung";
}

function positionBeschreibung(raw: Record<string, unknown>, title: string): string | undefined {
  const besch = String(raw.beschreibung ?? raw.notiz_extern ?? "").trim();
  if (!besch || besch === title) return undefined;
  return besch;
}

function vorschlagNettoFromRow(raw: Record<string, unknown>): number | null {
  const menge = Math.max(num(raw.menge) || 1, 0.0001);
  const ek = num(raw.einkaufspreis);
  if (ek > 0) return round2(ek * menge);
  const lohn = num(raw.lohn_netto);
  const mat = num(raw.material_netto);
  const fromParts = (lohn + mat) * menge;
  if (fromParts > 0) return round2(fromParts);
  return null;
}

export function parsePartnerHwKonditionen(raw: unknown): PartnerHwKonditionen | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const art = o.art === "gegenvorschlag" ? "gegenvorschlag" : "bestaetigt";
  const posRaw = o.positionen;
  if (!Array.isArray(posRaw)) return null;
  const positionen: PartnerHwKonditionPosition[] = [];
  for (const item of posRaw) {
    if (!item || typeof item !== "object") continue;
    const p = item as Record<string, unknown>;
    const hw = num(p.hw_netto);
    if (hw < 0) continue;
    positionen.push({
      position_id: String(p.position_id ?? ""),
      leistung: String(p.leistung ?? "Leistung").trim() || "Leistung",
      beschreibung:
        typeof p.beschreibung === "string" ? p.beschreibung.trim() || undefined : undefined,
      ek_netto:
        p.ek_netto == null ? null : num(p.ek_netto) > 0 ? round2(num(p.ek_netto)) : null,
      hw_netto: round2(hw),
      mwst_satz: resolveMwstSatz(p),
      geaendert: Boolean(p.geaendert),
      hw_notiz:
        typeof p.hw_notiz === "string" ? p.hw_notiz.trim() || undefined : undefined,
    });
  }
  if (!positionen.length) return null;
  return {
    art,
    positionen,
    eingereicht_at:
      typeof o.eingereicht_at === "string" ? o.eingereicht_at : undefined,
  };
}

function isPreisPosition(raw: Record<string, unknown>): boolean {
  const slug = String(raw.gewerk_slug ?? "");
  if (SKIP_POSITION_SLUGS.has(slug)) return false;
  return Boolean(
    String(raw.leistung ?? raw.leistung_name ?? "").trim() ||
      String(raw.gewerk_id ?? "").trim() ||
      slug
  );
}

function parsePositionenArray(raw: unknown): Record<string, unknown>[] {
  if (!raw) return [];
  let data: unknown = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(data)) return [];
  return data.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item)
  );
}

function filterPositionenRaw(
  raw: unknown,
  filter?: PartnerAngebotPositionenFilter
): Record<string, unknown>[] {
  const gewerkId = filter?.gewerkId?.trim() || "";
  const handwerkerId = filter?.handwerkerId?.trim() || "";
  return parsePositionenArray(raw).filter((row) => {
    if (!isPreisPosition(row)) return false;
    const rowGewerk = String(row.gewerk_id ?? "").trim();
    if (gewerkId && rowGewerk && rowGewerk !== gewerkId) return false;
    const rowHw = String(row.handwerker_id ?? "").trim();
    if (handwerkerId && rowHw && rowHw !== handwerkerId) return false;
    return true;
  });
}

export function buildPartnerKonditionZeilen(
  positionenRaw: unknown,
  filter?: PartnerAngebotPositionenFilter
): PartnerKonditionZeile[] {
  return filterPositionenRaw(positionenRaw, filter).map((row, i) => {
    const title = positionTitle(row);
    return {
      id: positionIdFromRow(row, i),
      title,
      beschreibung: positionBeschreibung(row, title),
      vorschlagNetto: vorschlagNettoFromRow(row),
      mwstSatz: resolveMwstSatz(row),
    };
  });
}

export function mergeKonditionRueckfrageZeilen(
  zeilen: PartnerKonditionZeile[],
  hw?: PartnerHwKonditionen | null
): PartnerKonditionZeile[] {
  if (!hw?.positionen.length) return zeilen;
  const byId = new Map(hw.positionen.map((p) => [p.position_id, p]));
  return zeilen.map((z) => {
    const prev = byId.get(z.id);
    if (!prev) return z;
    const vorher =
      prev.geaendert || (prev.hw_netto != null && z.vorschlagNetto != null &&
        Math.abs(prev.hw_netto - z.vorschlagNetto) > 0.009)
        ? prev.hw_netto
        : prev.ek_netto != null &&
            z.vorschlagNetto != null &&
            Math.abs(prev.ek_netto - z.vorschlagNetto) > 0.009
          ? prev.hw_netto
          : undefined;
    return {
      ...z,
      vorherNetto: vorher,
    };
  });
}

/** Nachreichung: vereinbarte Zeilen sperren, nur offene (neu/geänderter CRM-Preis) bearbeitbar. */
export function mergeKonditionNachreichungZeilen(
  zeilen: PartnerKonditionZeile[],
  hw: PartnerHwKonditionen | null | undefined,
  openIds: string[]
): PartnerKonditionZeile[] {
  const openSet = new Set(openIds);
  const byId = new Map(hw?.positionen.map((p) => [p.position_id, p]) ?? []);

  return zeilen.map((z) => {
    const prev = byId.get(z.id);
    const isOpen = openSet.has(z.id);

    if (!isOpen && prev) {
      return {
        ...z,
        hwNetto: prev.hw_netto,
        hwNotiz: prev.hw_notiz,
        vorschlagNetto: prev.hw_netto,
        geaendert: false,
        readonly: true,
        zeilenBadge: "vereinbart" as const,
      };
    }

    const isNew = !prev;
    const open: PartnerKonditionZeile = {
      ...z,
      readonly: false,
      ...(isNew ? { zeilenBadge: "neu" as const } : {}),
    };

    if (prev && isOpen) {
      return {
        ...open,
        vorherNetto: prev.hw_netto,
        hwNetto: undefined,
        hwNotiz: undefined,
      };
    }

    return open;
  });
}

export function mergeKonditionZeilenMitHw(
  zeilen: PartnerKonditionZeile[],
  hw?: PartnerHwKonditionen | null
): PartnerKonditionZeile[] {
  if (!hw?.positionen.length) return zeilen;
  const byId = new Map(hw.positionen.map((p) => [p.position_id, p]));
  return zeilen.map((z) => {
    const submitted = byId.get(z.id);
    if (!submitted) return z;
    return {
      ...z,
      hwNetto: submitted.hw_netto,
      hwNotiz: submitted.hw_notiz,
      geaendert: submitted.geaendert,
      vorschlagNetto: submitted.ek_netto ?? z.vorschlagNetto,
    };
  });
}

export function konditionZeilenNurAusHw(
  hw: PartnerHwKonditionen | null | undefined
): PartnerKonditionZeile[] {
  if (!hw?.positionen.length) return [];
  return hw.positionen.map((p) => ({
    id: p.position_id,
    title: p.leistung,
    beschreibung: p.beschreibung,
    vorschlagNetto: p.ek_netto,
    hwNetto: p.hw_netto,
    hwNotiz: p.hw_notiz,
    mwstSatz: p.mwst_satz,
    geaendert: p.geaendert,
  }));
}

export function summeKonditionNetto(
  zeilen: Array<{ hwNetto?: number | null; vorschlagNetto?: number | null }>,
  useHw = false
): number {
  let sum = 0;
  for (const z of zeilen) {
    const n = useHw
      ? z.hwNetto != null
        ? z.hwNetto
        : z.vorschlagNetto
      : z.vorschlagNetto;
    if (n != null && n > 0) sum += n;
  }
  return round2(sum);
}

export function summeKonditionBrutto(
  zeilen: PartnerKonditionZeile[],
  useHw = false
): number {
  let sum = 0;
  for (const z of zeilen) {
    const netto = useHw
      ? z.hwNetto != null
        ? z.hwNetto
        : z.vorschlagNetto
      : z.vorschlagNetto;
    if (netto == null || netto <= 0) continue;
    sum += round2(netto * (1 + z.mwstSatz / 100));
  }
  return round2(sum);
}

export function mapKonditionZeilenVereinbart(
  zeilen: PartnerKonditionZeile[]
): PartnerKonditionZeile[] {
  return zeilen.map((z) => {
    const netto =
      z.hwNetto != null && z.hwNetto > 0
        ? z.hwNetto
        : z.vorschlagNetto != null && z.vorschlagNetto > 0
          ? z.vorschlagNetto
          : null;
    return {
      ...z,
      vorschlagNetto: netto,
      hwNetto: netto ?? undefined,
      geaendert: false,
    };
  });
}

export type PartnerLeistungStatusAmpel = "gruen" | "gelb" | "rot";

/** Ampel neben Leistungstitel: grün = angenommen, gelb = Aktion nötig, rot = entfernt. */
export function resolvePartnerLeistungStatusAmpel(
  z: PartnerKonditionZeile,
  opts?: { mode?: "edit" | "readonly"; hwValue?: string; handwerker_status?: string | null }
): PartnerLeistungStatusAmpel {
  if (z.zeilenBadge === "entfernt") return "rot";
  if (z.zeilenBadge === "vereinbart") return "gruen";
  if (positionHandwerkerAbgeschlossen(opts?.handwerker_status)) return "gruen";
  if (z.zeilenBadge === "neu" || z.zeilenBadge === "geaendert") return "gelb";
  if (z.zeilenBadge === "vereinbart") return "gruen";
  if (z.readonly) return "gruen";
  if (opts?.mode === "edit" && !z.readonly) return "gelb";
  if (z.geaendert) return "gelb";
  const raw = opts?.hwValue?.trim();
  if (raw) {
    const hw = Number(raw.replace(",", "."));
    if (
      Number.isFinite(hw) &&
      z.vorschlagNetto != null &&
      z.vorschlagNetto > 0 &&
      Math.abs(hw - z.vorschlagNetto) > 0.009
    ) {
      return "gelb";
    }
  }
  const netto = z.hwNetto ?? z.vorschlagNetto;
  if (netto == null || netto <= 0) return "gelb";
  return "gruen";
}

function leistungTitleKeysFromPosition(pos: PartnerAuftragPosition): string[] {
  const full =
    [pos.gewerk_name, pos.leistung_name].filter(Boolean).join(" — ").trim() ||
    pos.leistung_name;
  return Array.from(
    new Set(
      [pos.leistung_name, full]
        .map((t) => normalizeKonditionLeistungKey(t))
        .filter(Boolean)
    )
  );
}

/**
 * Robuste Nachreichungs-Erkennung: Auftragspositionen, die in keiner
 * vereinbarten hw_konditionen-Zeile (alle angebot_handwerker zum Angebot) vorkommen.
 * Unabhängig von hw_status — entscheidend ist: Auftrag läuft, Leistung fehlt in der Einigung.
 */
export function resolveAuftragNachreichungOpenIds(
  auftragPositionen: PartnerAuftragPosition[],
  anfragen: Array<{ hw_konditionen?: PartnerHwKonditionen | null }>
): string[] {
  const fromStatus = resolveOffeneAuftragPositionIdsByStatus(auftragPositionen);
  if (fromStatus.length) return fromStatus;

  const agreedIds = new Set<string>();
  const agreedTitles = new Set<string>();
  let hasPriorAgreement = false;

  for (const a of anfragen) {
    for (const p of a.hw_konditionen?.positionen ?? []) {
      hasPriorAgreement = true;
      if (p.position_id) agreedIds.add(p.position_id);
      agreedTitles.add(normalizeKonditionLeistungKey(p.leistung));
    }
  }

  /** Laufender Auftrag mit bereits bearbeiteten Leistungen, aber ohne hw_konditionen-JSON. */
  if (!hasPriorAgreement) {
    const settled = auftragPositionen.some(
      (p) => !positionBrauchtHandwerkerAktion(p.handwerker_status)
    );
    if (!settled) return [];
  }

  const open: string[] = [];
  for (const pos of auftragPositionen) {
    if (!positionBrauchtVorgangAktion(pos)) continue;
    if (agreedIds.has(pos.id)) continue;
    const keys = leistungTitleKeysFromPosition(pos);
    if (keys.some((k) => agreedTitles.has(k))) continue;
    open.push(pos.id);
  }
  return open;
}

export function resolveNachreichungOpenZeilenIds(input: {
  crm_positionen_raw?: unknown;
  crm_auftrag_positionen?: PartnerAuftragPosition[];
  filter?: PartnerNachreichungFilter;
  hw_konditionen?: PartnerHwKonditionen | null;
  hw_status?: string | null;
  alle_hw_konditionen?: Array<PartnerHwKonditionen | null | undefined>;
}): string[] {
  const zugewiesenePositionen = (input.crm_auftrag_positionen ?? []).filter((p) =>
    positionIstHandwerkerZugewiesen(p.handwerker_status)
  );
  const zugewieseneIds = new Set(zugewiesenePositionen.map((p) => p.id));

  const ausStatus = zugewiesenePositionen.length
    ? resolveOffeneAuftragPositionIdsByStatus(
        zugewiesenePositionen,
        input.filter
      )
    : [];

  const anfragen = (input.alle_hw_konditionen ?? [input.hw_konditionen]).map(
    (hw) => ({ hw_konditionen: hw })
  );

  const ausAuftrag = zugewiesenePositionen.length
    ? resolveAuftragNachreichungOpenIds(zugewiesenePositionen, anfragen)
    : [];

  const ausAngebot = partnerKonditionenNachreichungZeilenIds(
    input.crm_positionen_raw,
    input.filter,
    input.hw_konditionen,
    input.hw_status,
    zugewiesenePositionen
  ).filter((id) => zugewieseneIds.has(id));

  return filterOffeneNachreichungPositionIds(
    zugewiesenePositionen,
    Array.from(new Set([...ausStatus, ...ausAuftrag, ...ausAngebot]))
  );
}

/** Entfernt bereits angenommene Positionen aus der offenen Nachreichungs-Liste. */
export function filterOffeneNachreichungPositionIds(
  positionen: PartnerAuftragPosition[] | undefined,
  ids: string[]
): string[] {
  if (!positionen?.length) return ids;
  const byId = new Map(positionen.map((p) => [p.id, p]));
  return ids.filter((id) => {
    const pos = byId.get(id);
    if (!pos) return false;
    return positionBrauchtVorgangAktion(pos);
  });
}

/** CRM-Leistungen, die nach Einigung noch nicht verhandelt sind (Angebots-JSON + Preisänderungen). */
export function partnerKonditionenNachreichungZeilenIds(
  positionenRaw: unknown,
  filter: PartnerNachreichungFilter | undefined,
  hw: PartnerHwKonditionen | null | undefined,
  hwStatus: string | null | undefined,
  auftragPositionen?: PartnerAuftragPosition[]
): string[] {
  const st = (hwStatus ?? "").toLowerCase();
  if (st !== "uebernommen" || !hw?.positionen.length) return [];

  const crmZeilen = buildNachreichungKonditionZeilen(
    positionenRaw,
    auftragPositionen,
    filter ?? {}
  );
  const agreedById = new Map(hw.positionen.map((p) => [p.position_id, p]));
  const agreedByTitle = new Map(
    hw.positionen.map((p) => [normalizeKonditionLeistungKey(p.leistung), p])
  );
  const open: string[] = [];

  for (const z of crmZeilen) {
    const prev = agreedHwPositionForZeile(z, agreedById, agreedByTitle);
    if (!prev) {
      open.push(z.id);
      continue;
    }
    const crm = z.vorschlagNetto;
    if (crm != null && crm > 0 && Math.abs(crm - prev.hw_netto) > 0.009) {
      open.push(z.id);
    }
  }
  return open;
}

export function hasPartnerKonditionenNachreichungAusstehend(input: {
  crm_positionen_raw?: unknown;
  crm_auftrag_positionen?: PartnerAuftragPosition[];
  gewerk_id?: string;
  gewerk_name?: string;
  handwerker_id?: string;
  hw_konditionen?: PartnerHwKonditionen | null;
  hw_status?: string | null;
  alle_hw_konditionen?: Array<PartnerHwKonditionen | null | undefined>;
}): boolean {
  return resolveNachreichungOpenZeilenIds({
    crm_positionen_raw: input.crm_positionen_raw,
    crm_auftrag_positionen: input.crm_auftrag_positionen,
    filter: {
      gewerkId: input.gewerk_id,
      handwerkerId: input.handwerker_id,
      gewerkName: input.gewerk_name,
    },
    hw_konditionen: input.hw_konditionen,
    hw_status: input.hw_status,
    alle_hw_konditionen: input.alle_hw_konditionen,
  }).length > 0;
}

export function buildHwKonditionenPayload(
  zeilen: PartnerKonditionZeile[],
  hwNettoById: Record<string, number>,
  hwNotizById?: Record<string, string>
): PartnerHwKonditionen {
  const positionen: PartnerHwKonditionPosition[] = zeilen.map((z) => {
    const hw_netto = round2(hwNettoById[z.id] ?? 0);
    const ek = z.vorschlagNetto;
    const geaendert =
      ek != null && ek > 0 ? Math.abs(hw_netto - ek) > 0.009 : hw_netto > 0;
    const notiz = hwNotizById?.[z.id]?.trim();
    return {
      position_id: z.id,
      leistung: z.title,
      beschreibung: z.beschreibung,
      ek_netto: ek,
      hw_netto,
      mwst_satz: z.mwstSatz,
      geaendert,
      ...(notiz ? { hw_notiz: notiz } : {}),
    };
  });
  const art = positionen.every((p) => !p.geaendert) ? "bestaetigt" : "gegenvorschlag";
  return {
    art,
    positionen,
    eingereicht_at: new Date().toISOString(),
  };
}

export function initialHwNettoInputs(
  zeilen: PartnerKonditionZeile[],
  hw?: PartnerHwKonditionen | null
): Record<string, string> {
  const out: Record<string, string> = {};
  const submitted = new Map(hw?.positionen.map((p) => [p.position_id, p.hw_netto]));
  for (const z of zeilen) {
    const fromHw = submitted.get(z.id);
    if (fromHw != null && fromHw > 0) {
      out[z.id] = String(fromHw).replace(".", ",");
      continue;
    }
    if (z.vorschlagNetto != null && z.vorschlagNetto > 0) {
      out[z.id] = String(z.vorschlagNetto).replace(".", ",");
    } else {
      out[z.id] = "";
    }
  }
  return out;
}

export function initialHwNotizInputs(
  zeilen: PartnerKonditionZeile[],
  hw?: PartnerHwKonditionen | null
): Record<string, string> {
  const out: Record<string, string> = {};
  const submitted = new Map(
    hw?.positionen.map((p) => [p.position_id, p.hw_notiz ?? ""]) ?? []
  );
  for (const z of zeilen) {
    out[z.id] = submitted.get(z.id) ?? z.hwNotiz ?? "";
  }
  return out;
}

/** CRM-Preise aus Zeilen (Handwerker bearbeitet Preise nicht mehr). */
export function buildKonditionenEingabeFromZeilen(
  zeilen: PartnerKonditionZeile[],
  notizen?: Record<string, string>
): Array<{ position_id: string; hw_netto: number; hw_notiz?: string }> | null {
  const rows: Array<{ position_id: string; hw_netto: number; hw_notiz?: string }> = [];
  for (const z of zeilen) {
    const netto =
      z.hwNetto != null && z.hwNetto > 0
        ? z.hwNetto
        : z.vorschlagNetto != null && z.vorschlagNetto > 0
          ? z.vorschlagNetto
          : null;
    if (netto == null) return null;
    const notiz = notizen?.[z.id]?.trim() || z.hwNotiz?.trim();
    rows.push({
      position_id: z.id,
      hw_netto: netto,
      ...(notiz ? { hw_notiz: notiz } : {}),
    });
  }
  if (!rows.length) return null;
  return rows;
}

export function parseHwNettoInput(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return round2(n);
}

export function sindKonditionPreiseGeaendert(
  zeilen: PartnerKonditionZeile[],
  hwValues: Record<string, string>
): boolean {
  return zeilen.some((z) => {
    if (z.readonly) return false;
    const hw = parseHwNettoInput(hwValues[z.id] ?? "");
    if (hw == null) return false;
    if (z.vorschlagNetto == null || z.vorschlagNetto <= 0) return hw > 0;
    return Math.abs(hw - z.vorschlagNetto) > 0.009;
  });
}
