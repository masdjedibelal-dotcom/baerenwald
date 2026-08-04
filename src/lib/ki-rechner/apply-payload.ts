import type {
  KiFunnelHandoff,
  KiParsedBekannt,
} from "@/lib/ki-rechner/types";
import type {
  FachdetailsState,
  Kundentyp,
  Situation,
  Zeitraum,
} from "@/lib/funnel/types";

const SITUATIONS = new Set<string>([
  "erneuern",
  "kaputt",
  "betreuung",
  "gewerbe",
]);

const KUNDENTYPEN = new Set<string>([
  "eigentuemer",
  "mieter",
  "hausverwaltung",
]);

const ZEITRAEUME = new Set<string>([
  "sofort",
  "diese_woche",
  "vier_wochen",
  "zwei_monate",
  "sechs_monate",
  "naechstes_jahr",
  "naechster_monat",
  "naechste_saison",
  "flexibel",
  "heute",
  "woche",
]);

const BEREICH_ALIASES: Record<string, string> = {
  elektro: "elektro",
  elektrik: "elektrik",
  maler: "waende",
  malerarbeiten: "waende",
  streichen: "waende",
  waende: "waende",
  bad: "bad",
  badezimmer: "bad",
  heizung: "heizung",
  boden: "boden",
  parkett: "boden",
  fliesen: "boden",
  fenster: "fenster",
  dach: "dach",
  fassade: "fassade",
  trockenbau: "trockenbau",
  garten: "garten",
  gartengestaltung: "gartengestaltung",
  terrasse: "gartengestaltung",
  rollrasen: "gartengestaltung",
  winter: "winter",
  winterdienst: "winter",
  reinigung: "reinigung",
  hausmeister: "hausmeister",
  baum: "baum",
  sanitaer: "sanitaer",
  sanitär: "sanitaer",
  rohrbruch: "sanitaer",
  wasserschaden: "sanitaer",
  schimmel: "schimmel",
  baum_notfall: "baum_notfall",
};

function normalizeSituation(raw: string | undefined): Situation | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  const map: Record<string, Situation> = {
    neubauen: "erneuern",
    neubau: "erneuern",
    renovieren: "erneuern",
    sanieren: "erneuern",
    renovierung: "erneuern",
    kaputt: "kaputt",
    notfall: "kaputt",
    reparatur: "kaputt",
    betreuung: "betreuung",
    pflege: "betreuung",
    gewerbe: "gewerbe",
    b2b: "gewerbe",
  };
  const v = map[s] ?? s;
  return SITUATIONS.has(v) ? (v as Situation) : null;
}

function normalizeZeitraum(raw: string | undefined): Zeitraum | null {
  if (!raw) return null;
  const z = raw.trim().toLowerCase();
  const map: Record<string, Zeitraum> = {
    drei_monate: "vier_wochen",
    "3_monate": "vier_wochen",
    ein_monat: "vier_wochen",
    naechster_monat: "naechster_monat",
    bald: "vier_wochen",
    asap: "sofort",
  };
  const v = map[z] ?? z;
  return ZEITRAEUME.has(v) ? (v as Zeitraum) : null;
}

function normalizeKundentyp(raw: string | undefined): Kundentyp | null {
  if (!raw) return null;
  const k = raw.trim().toLowerCase();
  const map: Record<string, Kundentyp> = {
    eigentuemer: "eigentuemer",
    eigentümer: "eigentuemer",
    mieter: "mieter",
    vermieter: "eigentuemer",
    hausverwaltung: "hausverwaltung",
    verwaltung: "hausverwaltung",
  };
  const v = map[k] ?? k;
  return KUNDENTYPEN.has(v) ? (v as Kundentyp) : null;
}

function normalizeBereiche(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const key = item.trim().toLowerCase();
    const mapped = BEREICH_ALIASES[key] ?? key;
    if (mapped && !out.includes(mapped)) out.push(mapped);
  }
  return out;
}

function mapFachdetails(
  bereiche: string[],
  raw: Record<string, string> | undefined
): Partial<FachdetailsState> {
  if (!raw || typeof raw !== "object") return {};
  const fd: Partial<FachdetailsState> = {};

  for (const [key, val] of Object.entries(raw)) {
    const v = String(val).trim().toLowerCase();
    if (!v) continue;

    if (key === "bad" || (bereiche.includes("bad") && key === "bad")) {
      fd.sanitaer = { ...fd.sanitaer, badWas: v };
      continue;
    }
    if (key === "boden" || bereiche.includes("boden")) {
      fd.boden = { ...fd.boden, ziel: v };
      continue;
    }
    if (key === "heizung" || bereiche.includes("heizung")) {
      fd.heizung = { ...fd.heizung, vorhaben: v, typ: v };
      continue;
    }
    if (key === "maler" || key === "waende") {
      fd.maler = { ...fd.maler, was: v };
      continue;
    }
    if (key === "dach") {
      fd.dach = { ...fd.dach, vorhaben: v };
      continue;
    }
    if (key === "fassade") {
      fd.fassade = { art: v as "anstrich" | "daemmung" | "bekleidung" };
      continue;
    }
    if (key === "garten" || key === "gartengestaltung") {
      if (v === "rollrasen" || v === "auffrischung") {
        fd.projekt = { ...fd.projekt, gartenLeistung: "rollrasen" };
      } else if (v === "terrasse") {
        fd.projekt = { ...fd.projekt, gartenLeistung: "terrasse" };
      } else {
        fd.garten = { ...fd.garten, was: v };
      }
    }
  }

  if (bereiche.includes("bad") && !fd.sanitaer?.badWas) {
    const badVal = raw.bad ?? raw.badsanierung;
    if (badVal) {
      fd.sanitaer = { badWas: String(badVal).trim().toLowerCase() };
    }
  }

  return fd;
}

export function kiPayloadToFunnelHandoff(
  payload: KiParsedBekannt
): KiFunnelHandoff | null {
  const situation = normalizeSituation(payload.situation);
  const bereiche = normalizeBereiche(payload.bereiche);
  if (!situation || bereiche.length === 0) return null;

  const groesse =
    typeof payload.groesse === "number" && payload.groesse > 0
      ? payload.groesse
      : null;

  const plz =
    typeof payload.plz === "string"
      ? payload.plz.replace(/\D/g, "").slice(0, 5)
      : "";

  const fachdetails = mapFachdetails(bereiche, payload.fachdetails);
  const badKomplett =
    bereiche.includes("bad") &&
    (fachdetails.sanitaer?.badWas === "komplett" ||
      payload.fachdetails?.bad === "komplett");

  return {
    situation,
    bereiche,
    groesse,
    groesseEinheit: groesse != null ? "qm" : null,
    plz,
    zeitraum: normalizeZeitraum(payload.zeitraum),
    kundentyp: normalizeKundentyp(payload.kundentyp),
    fachdetails,
    badAusstattung: badKomplett ? "standard" : null,
    zugaenglichkeit: "einfach",
    zustand: "mittel",
  };
}
