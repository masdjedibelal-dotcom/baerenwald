import { erneuernProjektTyp } from "@/lib/funnel/projekt-erneuern";
import type { FunnelState, Situation } from "@/lib/funnel/types";

function str(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) return v.map(String).join(", ");
  return String(v).trim();
}

function situationKopfzeile(situation: Situation | null): string {
  switch (situation) {
    case "erneuern":
      return "Projektanfrage";
    case "kaputt":
      return "Reparatur/Notfall";
    case "betreuung":
      return "Betreuungsanfrage (Garten, Winter, Hausmeister …)";
    case "gewerbe":
      return "Gewerbliche Anfrage";
    default:
      return "Anfrage (Situation offen)";
  }
}

const HEIZUNG_ZIEL_LABEL: Record<string, string> = {
  waermepumpe: "Wärmepumpe",
  hybrid: "Hybrid-Lösung",
  gas_brennwert: "Gas-Brennwert (Austausch)",
  beratung: "Beratung erwünscht",
};

function heizungZielWert(state: FunnelState): string | undefined {
  const z = state.fachdetails.heizung?.ziel;
  if (z) return z;
  const raw = state.fachdetails.fachdetailAnswers?.["heizung_ziel"];
  return typeof raw === "string" ? raw : undefined;
}

/** Sanitär-Lage / Zugang: `wand` = vermutet hinter Wand/im Boden. */
export function getSanitaerLage(state: FunnelState): string | undefined {
  const fd = state.fachdetails;
  const fromLegacy = fd.sanitaer?.lage?.trim();
  if (fromLegacy) return fromLegacy;
  const a = fd.fachdetailAnswers;
  const zug = a?.["sanitaer_leck_zugang"];
  if (typeof zug === "string" && zug) return zug;
  const lage = a?.["sanitaer_lage"];
  if (typeof lage === "string" && lage) return lage;
  const prob = a?.["sanitaer_problem"];
  if (typeof prob === "string" && prob) return prob;
  return undefined;
}

export function isSanitaerWandLeckortung(state: FunnelState): boolean {
  return getSanitaerLage(state) === "wand";
}

export function derivePreisModus(
  state: FunnelState
): "komplex" | "standard" {
  if (state.bereiche.includes("anbau")) return "komplex";
  if (isSanitaerWandLeckortung(state)) return "komplex";
  if (state.komplexReason) return "komplex";
  return "standard";
}

export function getProjectTypeForLead(state: FunnelState): string {
  if (state.bereiche.includes("anbau")) return "anbau_garage";
  const p = erneuernProjektTyp(state.bereiche);
  if (p) return p;
  return state.bereiche[0] ?? "standard";
}

/** Freitexte aus Gewerken + allgemein (wie bisher `collectBwFreitextAnhang`). */
export function collectFreitextAnhang(state: FunnelState): string {
  const parts: string[] = [];
  const fd = state.fachdetails;
  const push = (label: string, v: string | null | undefined) => {
    const t = (v ?? "").trim();
    if (t) parts.push(`${label}: ${t}`);
  };
  push("Elektro", fd.elektro?.freitext ?? null);
  push("Sanitär", fd.sanitaer?.freitext ?? null);
  push("Heizung", fd.heizung?.freitext ?? null);
  push("Maler", fd.maler?.freitext ?? null);
  push("Boden", fd.boden?.freitext ?? null);
  push("Dach", fd.dach?.freitext ?? null);
  push("Garten", fd.garten?.freitext ?? null);
  push("Fenster", fd.fenster?.freitext ?? null);
  push("Allgemein", state.freitext ?? null);
  return parts.join("\n");
}

function formatGroesse(state: FunnelState): string | null {
  if (state.groesse == null) return null;
  const u = state.groesseEinheit;
  if (u === "qm") return `ca. ${state.groesse} m²`;
  if (u === "stueck") return `ca. ${state.groesse} Stück`;
  if (u === "meter") return `ca. ${state.groesse} m`;
  return `ca. ${state.groesse}`;
}

/** Labels der zentralen Betreuungs-Kachel (`umfang`), analog zu {@link buildBetreuungHaeufigkeitStep}. */
const BETREUUNG_UMFANG_KURZ: Record<string, string> = {
  woechentlich: "Wöchentlich",
  zweimal_monat: "Alle 2 Wochen",
  monatlich: "Monatlich",
  saisonal: "Saisonal",
  einmalig: "Einmalig",
  saison: "Saison-Pauschale",
  nach_bedarf: "Nach Bedarf",
  jahresvertrag: "Jahresvertrag",
};

function gartenRhythmusFuerNotizen(state: FunnelState): string | undefined {
  if (state.situation === "betreuung" && state.umfang) {
    return BETREUUNG_UMFANG_KURZ[state.umfang] ?? state.umfang;
  }
  const h = state.fachdetails.garten?.haeufigkeit;
  return h && String(h).trim() ? String(h).trim() : undefined;
}

function gartenUmfangZeile(state: FunnelState): string | null {
  const fd = state.fachdetails;
  const pj = fd.projekt;
  const parts: string[] = [];
  const flaeche = formatGroesse(state);
  if (flaeche) parts.push(`Fläche/Umfang: ${flaeche}`);
  if (fd.garten?.was) parts.push(`Thema: ${fd.garten.was}`);
  const rhythm = gartenRhythmusFuerNotizen(state);
  if (rhythm) parts.push(`Rhythmus: ${rhythm}`);
  if (pj?.gartenLeistung)
    parts.push(
      pj.gartenLeistung === "neuanlage" ? "Neuanlage" : "Auffrischung"
    );
  if (pj?.gartenZaun === "ja") parts.push("inkl. Zaunbau");
  else if (pj?.gartenZaun === "nein") parts.push("ohne Zaunbau");
  if (parts.length === 0) return null;
  return `Garten: ${parts.join(" · ")}`;
}

function fachdetailAntwortenBlock(state: FunnelState): string {
  const ans = state.fachdetails.fachdetailAnswers;
  if (!ans || Object.keys(ans).length === 0) return "";
  const lines = Object.keys(ans)
    .sort()
    .map((k) => {
      const v = ans[k];
      const t = str(v);
      if (!t) return null;
      return `  • ${k}: ${t}`;
    })
    .filter(Boolean) as string[];
  if (lines.length === 0) return "";
  return ["Antworten (IDs):", ...lines].join("\n");
}

/**
 * Erste Leselinie fürs CRM: Situation, Risiken, Ziele, Garten-Kontext, PLZ/Zeit, Freitexte, flache Fachdetails.
 */
export function generateFunnelHumanSummary(state: FunnelState): string {
  const lines: string[] = [];
  lines.push(`=== ${situationKopfzeile(state.situation)} ===`);
  if (state.bereiche.length)
    lines.push(`Bereiche: ${state.bereiche.join(", ")}`);
  if (state.plz.trim()) lines.push(`PLZ: ${state.plz.trim()}`);
  if (state.zeitraum) lines.push(`Zeitraum: ${state.zeitraum}`);
  if (state.dringlichkeit) lines.push(`Dringlichkeit: ${state.dringlichkeit}`);
  if (state.kundentyp) lines.push(`Kundentyp: ${state.kundentyp}`);

  if (isSanitaerWandLeckortung(state)) {
    lines.push(
      "⚠️ ACHTUNG: Schaden wird hinter der Wand/im Boden vermutet (Leckortung!)"
    );
  }

  const hz = heizungZielWert(state);
  if (hz) {
    const label = HEIZUNG_ZIEL_LABEL[hz] ?? hz;
    lines.push(`Ziel-System (Heizung): ${label}`);
  }

  const gz = gartenUmfangZeile(state);
  if (gz) lines.push(gz);

  const fdBlock = fachdetailAntwortenBlock(state);
  if (fdBlock) {
    lines.push("");
    lines.push(fdBlock);
  }

  const strukt = strukturierteFachdetailZeilen(state);
  if (strukt) {
    lines.push("");
    lines.push(strukt);
  }

  return lines.join("\n").trim();
}

/** Legacy-Struktur (ohne reine Freitexte — die folgen im zweiten Block). */
function strukturierteFachdetailZeilen(state: FunnelState): string {
  const fd = state.fachdetails;
  const rows: string[] = [];
  const e = fd.elektro;
  if (e?.problem || e?.folge) {
    rows.push(
      `Elektro: ${[e.problem, e.folge].filter(Boolean).join(" → ") || "—"}`
    );
  }
  const s = fd.sanitaer;
  if (s?.lage || s?.badWas || s?.rohre || s?.notfallSchwere) {
    rows.push(
      `Sanitär: Lage ${s.lage ?? "—"}, Problem/Bad ${s.badWas ?? "—"}, Rohre ${s.rohre ?? "—"}, Notfall-Schwere ${s.notfallSchwere ?? "—"}`
    );
  }
  const h = fd.heizung;
  if (h?.typ || h?.alter || h?.vorhaben || h?.anzahl != null) {
    rows.push(
      `Heizung: Typ ${h.typ ?? "—"}, Alter ${h.alter ?? "—"}, Vorhaben ${h.vorhaben ?? "—"}, Anzahl HK ${h.anzahl ?? "—"}`
    );
  }
  const m = fd.maler;
  if (m?.was || m?.zustand) {
    rows.push(`Maler: ${m.was ?? "—"}, Zustand ${m.zustand ?? "—"}`);
  }
  const b = fd.boden;
  if (b?.aktuell || b?.ziel || b?.verlegung) {
    rows.push(
      `Boden: aktuell ${b.aktuell ?? "—"}, Ziel ${b.ziel ?? "—"}, Verlegung ${b.verlegung ?? "—"}`
    );
  }
  const d = fd.dach;
  if (d?.vorhaben || d?.alter) {
    rows.push(`Dach: ${d.vorhaben ?? "—"}, Alter ${d.alter ?? "—"}`);
  }
  const g = fd.garten;
  const gartenRhythmus = gartenRhythmusFuerNotizen(state);
  if (g?.was || gartenRhythmus || g?.baumgroesse) {
    rows.push(
      `Garten (Betreuung): ${[g?.was, gartenRhythmus, g?.baumgroesse].filter(Boolean).join(" · ") || "—"}`
    );
  }
  const f = fd.fenster;
  if (f?.ausstattung || f?.defekt) {
    rows.push(
      `Fenster: Ausstattung ${f.ausstattung ?? "—"}, Defekt ${f.defekt ?? "—"}`
    );
  }
  const fa = fd.fassade?.art;
  if (fa) rows.push(`Fassade: ${fa}`);
  const pj = fd.projekt;
  if (pj && Object.keys(pj).length > 0) {
    rows.push(`Projekt-Details: ${JSON.stringify(pj)}`);
  }
  if (rows.length === 0) return "";
  return ["Strukturierte Fachdetails:", ...rows.map((r) => `  • ${r}`)].join(
    "\n"
  );
}

export function buildTechnicalDetailsForLead(state: FunnelState): {
  isNotfall: boolean;
  hasSpecificLocation: boolean;
  projectType: string;
  preis_modus: "komplex" | "standard";
} {
  const san = getSanitaerLage(state);
  return {
    isNotfall:
      state.zeitraum === "sofort" || state.dringlichkeit === "sofort",
    hasSpecificLocation: Boolean(san && san.length > 0),
    projectType: getProjectTypeForLead(state),
    preis_modus: derivePreisModus(state),
  };
}

/** Vollständige Notiz: strukturierte Zusammenfassung + bisherige Freitexte. */
export function buildFullLeadNotizen(
  state: FunnelState,
  extra?: string | null | undefined
): string {
  const summary = generateFunnelHumanSummary(state);
  const frei = collectFreitextAnhang(state);
  const ex = (extra ?? "").trim();
  const chunks = [summary, frei, ex].filter(Boolean);
  return chunks.join("\n\n").trim();
}
