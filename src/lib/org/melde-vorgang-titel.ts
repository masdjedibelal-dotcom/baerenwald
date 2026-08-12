/**
 * Natürliche Vorgangs-Titel für Melde-Funnel.
 * Statt „Notfall · Bad“ / „Reparatur · Sanitär“ → sprechende Sätze mit Platzhaltern.
 */

import type { MeldeAnswers } from "@/lib/funnel/melde-dynamic-questions";
import { normalizeFunnelDaten } from "@/lib/lead-funnel-daten";
import { labelBereich } from "@/lib/lead-funnel-labels";
import {
  isMeldeBereichId,
  meldeBereichLabel,
  type MeldeBereichId,
} from "@/lib/org/melde-bereiche";
import {
  meldeSchadenKurz,
  resolveMeldeUrsachenBereich,
} from "@/lib/org/melde-ursachen";

const GENERIC_TITEL = new Set([
  "meldung",
  "vorgang",
  "reparatur",
  "notfall",
  "schaden",
  "sonstiges",
  "wasserschaden",
  "heizung / warmwasser",
  "strom / elektrik",
  "fenster / tür",
  "dach / regenrinne",
  "schimmel / fassade",
  "außenanlage / weg",
  "sanitär / wasser",
]);

/** Ort sprachlich an Problem hängen. */
export function joinProblemOrt(
  problem: string,
  ort: string | null | undefined
): string {
  const p = problem.trim();
  const o = ort?.trim();
  if (!p) return o || "Meldung";
  if (!o) return p;

  const im = new Set([
    "Bad",
    "WC",
    "Keller",
    "Flur",
    "Treppenhaus",
    "Schlafzimmer",
    "Wohnzimmer",
    "Zimmer",
    "Müllraum",
    "Müllplatz",
    "Hof",
    "Garten",
    "Parkplatz",
    "Spielplatz",
  ]);
  const inDer = new Set([
    "Küche",
    "Wohnung",
    "Garage",
    "Tiefgarage",
    "Fassade",
    "Außenfassade",
    "Zufahrt",
  ]);
  const am = new Set(["Balkon", "Eingang", "Heizkörper", "Gehweg"]);

  if (im.has(o)) return `${p} im ${o}`;
  if (inDer.has(o)) return `${p} in der ${o}`;
  if (am.has(o)) return `${p} am ${o}`;
  if (/^(Fenster|Tür|Balkon)/i.test(o)) return `${p} — ${o}`;
  return `${p} — ${o}`;
}

function answersFromFunnel(funnelDaten: unknown): MeldeAnswers {
  return (
    normalizeFunnelDaten(funnelDaten).fachdetails.fachdetailAnswers ?? {}
  );
}

function meldeBereichFromFunnel(
  funnelDaten: unknown,
  bereiche?: string[] | null
): MeldeBereichId | null {
  if (funnelDaten && typeof funnelDaten === "object" && !Array.isArray(funnelDaten)) {
    const raw = (funnelDaten as Record<string, unknown>).melde_bereich;
    if (typeof raw === "string" && isMeldeBereichId(raw)) return raw;
  }
  const first = bereiche?.[0]?.trim();
  if (!first) return null;
  if (isMeldeBereichId(first)) return first;
  if (first === "sanitaer" || first === "wasser") return "wasser";
  if (first === "elektro" || first === "elektrik" || first === "strom")
    return "strom";
  if (first === "feuchtigkeit_schimmel") return "schimmel";
  if (first === "fenster" || first === "fenster_tueren") return "fenster_tuer";
  return null;
}

function firstMeaningfulLine(text: string | null | undefined): string | null {
  if (!text?.trim()) return null;
  const line = text
    .trim()
    .split(/\n/)[0]
    ?.replace(/\s+/g, " ")
    .trim();
  if (!line || line.length < 4) return null;
  if (GENERIC_TITEL.has(line.toLowerCase())) return null;
  return line.length > 72 ? `${line.slice(0, 69).trimEnd()}…` : line;
}

function isGenericTitel(t: string): boolean {
  const n = t.trim().toLowerCase();
  if (!n) return true;
  if (GENERIC_TITEL.has(n)) return true;
  // Altes Muster „Notfall · Bad“ / „Reparatur · Sanitär“
  if (/^(notfall|reparatur|schaden|sonstiges)\s*[·|—-]\s*/i.test(t.trim())) {
    return true;
  }
  return false;
}

export type MeldeVorgangTitelInput = {
  situation?: string | null;
  bereiche?: string[] | null;
  funnelDaten?: unknown;
  /** Freitext / kontakt_nachricht / notizen */
  beschreibung?: string | null;
  notfall?: boolean | null;
};

/**
 * Sprechender List-/Detail-Titel für Melde-Vorgänge.
 * Dringlichkeit bleibt am Status-Chip (NOTFALL) — nicht im Titel wiederholen.
 */
export function buildMeldeVorgangTitel(input: MeldeVorgangTitelInput): string {
  const answers = answersFromFunnel(input.funnelDaten);
  const bereichId = meldeBereichFromFunnel(input.funnelDaten, input.bereiche);
  const bereichLabel = bereichId
    ? meldeBereichLabel(bereichId)
    : formatAnfrageGewerk(input.bereiche);

  const ursachenBereich = resolveMeldeUrsachenBereich({
    answers,
    bereichLabel,
    bereiche: input.bereiche,
  });

  let core = "";
  if (ursachenBereich) {
    core = meldeSchadenKurz(ursachenBereich, answers).trim();
  }

  if (!core || isGenericTitel(core)) {
    core =
      firstMeaningfulLine(input.beschreibung) ||
      bereichLabel ||
      "Meldung";
  }

  // Alte „·“-Joins aus SchadenKurz auf natürliche Sprache ziehen
  if (core.includes(" · ")) {
    const [left, right] = core.split(" · ").map((s) => s.trim());
    if (left && right) core = joinProblemOrt(left, right);
  }

  return core.length > 80 ? `${core.slice(0, 77).trimEnd()}…` : core;
}

function formatAnfrageGewerk(bereiche?: string[] | null): string | undefined {
  const parts = (bereiche ?? [])
    .map((b) => labelBereich(String(b).trim()))
    .filter((l) => l && l !== "—");
  return parts.length ? parts.join(", ") : undefined;
}

/** Ob Lead eine Melde-Meldung ist (Titel aus Funnel ableiten). */
export function leadIstMeldeTitelQuelle(lead: {
  anlass?: string | null;
  kanal?: string | null;
  funnelDaten?: unknown;
}): boolean {
  if (lead.anlass === "meldung") return true;
  const kanal = (lead.kanal ?? "").toLowerCase();
  if (kanal.startsWith("hv_")) return true;
  if (lead.funnelDaten && typeof lead.funnelDaten === "object") {
    const f = lead.funnelDaten as Record<string, unknown>;
    if (f.melde_bereich || f.melde_kategorie || f.fachdetailAnswers) return true;
  }
  return false;
}

/** Notification-Titel mit Platzhalter. */
export function formatMeldeNotifTitel(
  template: string,
  vars: { titel?: string | null; objekt?: string | null; nr?: string | null }
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = vars[key as keyof typeof vars];
    return v?.trim() ? v.trim() : "";
  })
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,:.])/g, "$1")
    .replace(/:\s*$/g, "")
    .trim();
}

export const MELDE_NOTIF_COPY = {
  neuesAngebot: "Angebot bereit: {titel}",
  neuesAngebotBody: "„{titel}“ liegt im Portal zur Prüfung bereit.",
  partnerErledigt: "Erledigt: {titel}",
  partnerTeilabschluss: "Teilabschluss: {titel}",
  bautagebuch: "Update: {titel}",
} as const;
