/**
 * Portal 2.0 E1–E2 — Objekte-Liste / Wizard (`objWizValid` / `objWizNext`).
 */

export const OBJ_WIZ_STEPS = [
  ["stamm", "Stammdaten"],
  ["einheiten", "Einheiten"],
  ["verwaltung", "Verwaltung"],
  ["regeln", "Regeln"],
  ["fertig", "Prüfen"],
] as const;

export type ObjWizStepId = (typeof OBJ_WIZ_STEPS)[number][0];

export const OBJ_TYP_OPTIONS = [
  "Mehrfamilienhaus",
  "Wohnanlage",
  "Einfamilienhaus (B2C)",
] as const;

export type ObjWizDraft = {
  name?: string;
  typ?: string;
  adr?: string;
  plz?: string;
  ort?: string;
  we?: number | string;
  hv?: string;
  kontakt?: string;
  tel?: string;
  schwelle?: number | string | null;
  /** UI only — Persistenz objektbezogen = OFFENE-PUNKTE (kein DB-Feld). */
  autopass?: boolean;
};

export const OBJ_WIZ_ERRORS: Record<string, string> = {
  stamm: "Bitte Bezeichnung, Typ und Adresse ausfüllen.",
  einheiten: "Bitte mindestens 1 Einheit angeben.",
  verwaltung: "Bitte die Hausverwaltung angeben.",
};

export const OBJ_WIZ_TITLES: Record<ObjWizStepId, string> = {
  stamm: "Stammdaten",
  einheiten: "Wie viele Einheiten?",
  verwaltung: "Verwaltung & Kontakt",
  regeln: "Freigabe-Regeln",
  fertig: "Prüfen & anlegen",
};

/** Mock-Detail-Tabs (`screenObjektDetail`). */
export const OBJ_DETAIL_TABS = [
  { id: "stamm", label: "Stammdaten" },
  { id: "einheiten", label: "Einheiten" },
  { id: "mieter", label: "Mieter" },
  { id: "vorgaenge", label: "Vorgänge" },
  { id: "regeln", label: "Regeln" },
  { id: "eigentuemer", label: "Eigentümer" },
  { id: "dokumente", label: "Dokumente" },
] as const;

export type ObjDetailTabId = (typeof OBJ_DETAIL_TABS)[number]["id"];

const META_RE = /<!--portal2-objekt:([\s\S]*?)-->/;

export type Portal2ObjektMeta = {
  typ?: string;
  hv?: string;
  kontakt?: string;
  tel?: string;
};

/** Typ/HV ohne Migration in `notizen_intern` (HTML-Kommentar-Meta). */
export function encodeObjektMeta(
  meta: Portal2ObjektMeta,
  existing?: string | null
): string {
  const cleaned = (existing ?? "").replace(META_RE, "").trim();
  const blob = `<!--portal2-objekt:${JSON.stringify(meta)}-->`;
  return cleaned ? `${blob}\n${cleaned}` : blob;
}

export function decodeObjektMeta(
  notizen?: string | null
): Portal2ObjektMeta {
  const m = notizen?.match(META_RE);
  if (!m?.[1]) return {};
  try {
    return JSON.parse(m[1]) as Portal2ObjektMeta;
  } catch {
    return {};
  }
}

export function parseEinheitenCount(hinweis?: string | null): number {
  const m = hinweis?.match(/(\d+)/);
  if (!m) return 1;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export function formatEinheitenHinweis(we: number): string {
  const n = Math.max(1, Math.floor(we) || 1);
  return n === 1 ? "1 Wohneinheit" : `${n} Wohneinheiten`;
}

/**
 * E1 Karten-Badge / Melde: „6 Wohneinheiten“.
 * Primär `einheiten_hinweis`, sonst Count aus `objekt_einheiten`.
 */
export function formatObjCardEinheiten(
  einheitenHinweis?: string | null,
  einheitenCount?: number | null
): string {
  const hint = einheitenHinweis?.trim();
  if (hint) {
    if (/wohneinheit/i.test(hint) || /^\d+\s*einheiten?$/i.test(hint)) {
      const n = parseEinheitenCount(hint);
      return formatEinheitenHinweis(n);
    }
    return hint;
  }
  if (
    typeof einheitenCount === "number" &&
    Number.isFinite(einheitenCount) &&
    einheitenCount > 0
  ) {
    return formatEinheitenHinweis(einheitenCount);
  }
  return formatEinheitenHinweis(1);
}

/** Spec E1: Adresse als eine Zeile (Straße · PLZ Ort). */
export function formatObjektAdresse(input: {
  strasse?: string | null;
  hausnummer?: string | null;
  plz?: string | null;
  ort?: string | null;
}): string {
  const street = formatObjektStrasse(input);
  const plzOrt = formatObjektPlzOrt(input);
  return [street, plzOrt].filter(Boolean).join(" · ");
}

export function resolveObjektTyp(input: {
  typ?: string | null;
  notizen_intern?: string | null;
  einheiten_hinweis?: string | null;
  einheitenCount?: number | null;
}): string {
  const fromCol = input.typ?.trim();
  if (fromCol) return fromCol;
  const meta = decodeObjektMeta(input.notizen_intern);
  if (meta.typ?.trim()) return meta.typ.trim();
  const we =
    typeof input.einheitenCount === "number" && input.einheitenCount > 0
      ? Math.floor(input.einheitenCount)
      : parseEinheitenCount(input.einheiten_hinweis);
  return we === 1 ? "Einfamilienhaus (B2C)" : "Mehrfamilienhaus";
}

/** Mock-Kartenzeile: „Mehrfamilienhaus · 6 WE“. */
export function formatObjektTypLine(input: {
  typ?: string | null;
  notizen_intern?: string | null;
  einheiten_hinweis?: string | null;
  einheitenCount?: number | null;
}): string {
  const typ = resolveObjektTyp(input);
  const we =
    typeof input.einheitenCount === "number" && input.einheitenCount > 0
      ? Math.floor(input.einheitenCount)
      : parseEinheitenCount(input.einheiten_hinweis);
  if (typ === "Einfamilienhaus (B2C)") return typ;
  return `${typ} · ${we} WE`;
}

export type ObjCardModel = {
  id: string;
  name: string;
  adresse: string;
  typLine: string;
  einheitenLabel: string;
  offen: number;
  coverUrl?: string | null;
};

/** E1 Kartenmodell aus `kunden_objekte` (+ optional Einheiten-Count). */
export function buildObjCardModel(
  o: {
    id: string;
    titel: string;
    strasse?: string | null;
    hausnummer?: string | null;
    plz?: string | null;
    ort?: string | null;
    typ?: string | null;
    notizen_intern?: string | null;
    einheiten_hinweis?: string | null;
    einheitenCount?: number | null;
    cover_url?: string | null;
  },
  offen = 0
): ObjCardModel {
  return {
    id: o.id,
    name: o.titel?.trim() || "Objekt",
    adresse: formatObjektAdresse(o) || "—",
    typLine: formatObjektTypLine(o),
    einheitenLabel: formatObjCardEinheiten(
      o.einheiten_hinweis,
      o.einheitenCount
    ),
    offen,
    coverUrl: o.cover_url ?? null,
  };
}

export function formatObjektPlzOrt(input: {
  plz?: string | null;
  ort?: string | null;
}): string {
  return [input.plz?.trim(), input.ort?.trim()].filter(Boolean).join(" ");
}

export function formatObjektStrasse(input: {
  strasse?: string | null;
  hausnummer?: string | null;
}): string {
  return [input.strasse?.trim(), input.hausnummer?.trim()]
    .filter(Boolean)
    .join(" ");
}

/** Mock `objWizValid`. */
export function objWizValid(step: ObjWizStepId, d: ObjWizDraft): boolean {
  if (step === "stamm") {
    return !!(d.name?.trim() && d.typ && d.adr?.trim());
  }
  if (step === "einheiten") {
    const we = d.we === undefined || d.we === "" ? 1 : Number(d.we);
    return Number.isFinite(we) && we >= 1;
  }
  if (step === "verwaltung") {
    return !!d.hv?.trim();
  }
  return true;
}

export function objWizError(step: ObjWizStepId): string | null {
  return OBJ_WIZ_ERRORS[step] ?? null;
}

export type ObjWizPayload = {
  titel: string;
  strasse: string;
  hausnummer: string;
  plz: string;
  ort: string;
  einheiten_hinweis: string;
  freigabe_schwelle_eur: number | null;
  notizen_intern: string;
  /** E1 Spalte `kunden_objekte.typ` (Migration STOP). */
  typ: string;
  typLabel: string;
  we: number;
};

/**
 * Mock `objWizNext` Ergebnis — bei letztem Schritt Payload für API.
 */
export function objWizNext(
  steps: typeof OBJ_WIZ_STEPS,
  stepIndex: number,
  d: ObjWizDraft,
  existingNotizen?: string | null
):
  | { ok: false; error: string }
  | { ok: true; stepIndex: number; done: false }
  | { ok: true; done: true; payload: ObjWizPayload } {
  const step = steps[stepIndex]?.[0];
  if (!step) return { ok: false, error: "Ungültiger Schritt." };
  if (!objWizValid(step, d)) {
    return { ok: false, error: objWizError(step) ?? "Bitte Angaben prüfen." };
  }
  if (stepIndex < steps.length - 1) {
    return { ok: true, stepIndex: stepIndex + 1, done: false };
  }

  const we = Math.max(
    1,
    Number(d.we === undefined || d.we === "" ? 1 : d.we) || 1
  );
  const typ = d.typ ?? "Mehrfamilienhaus";
  const typLabel =
    typ === "Einfamilienhaus (B2C)" ? typ : `${typ} · ${we} WE`;
  const adr = (d.adr ?? "").trim();
  const plzOrt = (d.plz ?? "").trim();
  const plzMatch = plzOrt.match(/^(\d{4,5})\s*(.*)$/);
  const plz = plzMatch?.[1] ?? plzOrt;
  const ort = plzMatch?.[2]?.trim() || (d.ort ?? "").trim();
  const adrMatch = adr.match(/^(.*?)[\s,]+(\d+\s*[a-zA-Z]?)$/);
  const strasse = adrMatch?.[1]?.trim() || adr;
  const hausnummer = adrMatch?.[2]?.trim() || "";

  const schwelleRaw = d.schwelle;
  const schwelle =
    schwelleRaw === undefined || schwelleRaw === null || schwelleRaw === ""
      ? 500
      : Number(schwelleRaw);

  return {
    ok: true,
    done: true,
    payload: {
      titel: (d.name ?? "").trim(),
      strasse,
      hausnummer,
      plz,
      ort,
      einheiten_hinweis: formatEinheitenHinweis(we),
      freigabe_schwelle_eur: Number.isFinite(schwelle) ? schwelle : 500,
      notizen_intern: encodeObjektMeta(
        {
          typ,
          hv: d.hv?.trim() || undefined,
          kontakt: d.kontakt?.trim() || undefined,
          tel: d.tel?.trim() || undefined,
        },
        existingNotizen
      ),
      typ,
      typLabel,
      we,
    },
  };
}

/**
 * Lösch-Schutz: aktive Vorgänge am Objekt.
 * Spec: nicht löschbar, wenn aktive Vorgänge hängen.
 */
export function objektHasActiveVorgaenge(
  offenCount: number | null | undefined
): boolean {
  return (offenCount ?? 0) > 0;
}

export const OBJ_DELETE_BLOCKED =
  "Objekt kann nicht gelöscht werden: Es hängen noch offene Vorgänge daran." as const;

export const OBJ_DELETE_CONFIRM_PREFIX = "Objekt" as const;

export function objDeleteConfirm(name: string): string {
  return `Objekt „${name}“ wirklich löschen? Zugeordnete Vorgänge bleiben erhalten.`;
}

export const OBJ_AUTOPASS_OFFENER_PUNKT =
  "Notfall-Autopass pro Objekt: kein DB-Feld — Toggle speichert noch nicht (OFFENE-PUNKTE). Org-weit: notfall_direkt." as const;

/** Mock Wizard/Detail — Autopass-Beschreibung (wortwörtlich). */
export const OBJ_AUTOPASS_WIZARD_DESC =
  "Bei Notfällen direkt Handwerker anfragen, ohne HV-Freigabe." as const;

export const OBJ_AUTOPASS_DETAIL_DESC =
  "Bei Notfall-Meldungen direkt Handwerker anfragen, ohne HV-Freigabe." as const;

export const OBJ_REGELN_FALLBACK =
  "Ohne eigene Regel gilt die Einstellung der Hausverwaltung: Autopass aus · Schwelle 500 €." as const;

/** Mock `objMieterMenu` Labels. */
export const OBJ_MIETER_MENU = {
  einladen: "Zum Portal einladen",
  erneut: "Portal-Link erneut senden",
  bearbeiten: "Bearbeiten",
  vorgaenge: "Vorgänge ansehen",
  entfernen: "Mieter entfernen",
} as const;

export const OBJ_MIETER_PORTAL_STATUS = {
  aktiv: "● Portal aktiv",
  eingeladen: "◔ Eingeladen",
  nicht: "○ Nicht eingeladen",
} as const;

export function formatObjRegelnReview(autopass: boolean, schwelle: number): string {
  return `${autopass ? "Autopass an" : "Autopass aus"} · Schwelle ${formatSchwelleEur(schwelle)}`;
}

export function formatObjektIdKurz(id: string): string {
  const clean = id.replace(/-/g, "").slice(0, 4).toUpperCase();
  return `OBJ-${clean || "----"}`;
}

/**
 * Mock `openObjEdit` — Draft für Wizard aus bestehendem Objekt.
 */
export function openObjEditDraft(
  o: {
    titel: string;
    typ?: string | null;
    notizen_intern?: string | null;
    einheiten_hinweis?: string | null;
    einheitenCount?: number | null;
    strasse?: string | null;
    hausnummer?: string | null;
    plz?: string | null;
    ort?: string | null;
    freigabe_schwelle_eur?: number | null;
  },
  defaultHv = ""
): ObjWizDraft {
  const meta = decodeObjektMeta(o.notizen_intern);
  const we =
    typeof o.einheitenCount === "number" && o.einheitenCount > 0
      ? o.einheitenCount
      : parseEinheitenCount(o.einheiten_hinweis);
  return {
    name: o.titel,
    typ: resolveObjektTyp(o),
    adr: formatObjektStrasse(o) || o.titel,
    plz: formatObjektPlzOrt(o),
    we,
    hv: meta.hv || defaultHv,
    kontakt: meta.kontakt || "",
    tel: meta.tel || "",
    schwelle: o.freigabe_schwelle_eur ?? 500,
    autopass: false,
  };
}

export type ObjMieterPortalStatus = keyof typeof OBJ_MIETER_PORTAL_STATUS;

/** Heuristik ohne eigenes Portal-Konto-Feld: E-Mail → eingeladen. */
export function resolveObjMieterPortalStatus(input: {
  email?: string | null;
  portalAktiv?: boolean | null;
}): ObjMieterPortalStatus {
  if (input.portalAktiv) return "aktiv";
  if (input.email?.trim()) return "eingeladen";
  return "nicht";
}

/** Lead gilt als „offen“ für Objekt-Badge / Lösch-Schutz. */
export function leadIsOffenAmObjekt(lead: {
  status?: string | null;
  vorgang_phase?: string | null;
  hv_meldung_status?: string | null;
}): boolean {
  const status = (lead.status ?? "").toLowerCase().replace(/[\s-]+/g, "_");
  if (status === "storniert" || status === "abgelehnt") return false;
  const phase = (lead.vorgang_phase ?? "")
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (phase === "abgeschlossen" || phase === "erledigt") return false;
  const hv = (lead.hv_meldung_status ?? "")
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (hv === "abgeschlossen") return false;
  return true;
}

export function countOffeneByObjektId(
  leads: Array<{
    kunde_objekt_id?: string | null;
    status?: string | null;
    vorgang_phase?: string | null;
    hv_meldung_status?: string | null;
  }>
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const lead of leads) {
    const oid = lead.kunde_objekt_id?.trim();
    if (!oid || !leadIsOffenAmObjekt(lead)) continue;
    out[oid] = (out[oid] ?? 0) + 1;
  }
  return out;
}

/** Mock `copyObj` Namenslogik. */
export function nextObjektKopieName(
  baseName: string,
  existingNames: string[]
): string {
  const base = baseName.replace(/\s*\(Kopie(?:\s*\d+)?\)$/, "").trim();
  let name = `${base} (Kopie)`;
  let n = 2;
  const set = new Set(existingNames.map((x) => x.trim()));
  while (set.has(name)) {
    name = `${base} (Kopie ${n})`;
    n += 1;
  }
  return name;
}

export function formatSchwelleEur(value: number | null | undefined): string {
  const n = value == null || !Number.isFinite(Number(value)) ? 500 : Number(value);
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}
