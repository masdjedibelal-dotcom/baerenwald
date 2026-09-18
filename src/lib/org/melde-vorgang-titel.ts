/**
 * Natürliche Vorgangs-Titel für Melde-Funnel.
 * Statt „Notfall · Bad“ / „Reparatur · Sanitär“ → sprechende Sätze mit Platzhaltern.
 */

import type { MeldeAnswers } from "@/lib/funnel/melde-dynamic-questions";
import { normalizeFunnelDaten } from "@/lib/lead-funnel-daten";
import { labelBereich, labelSituation } from "@/lib/lead-funnel-labels";
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
  // Einzelwort ohne Leerzeichen / Interpunktion → oft Tippfehler-Name, kein Titel
  if (line.length <= 24 && !/\s/.test(line) && !/[.,;:!?/]/.test(line)) {
    return null;
  }
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

/** Bereichs-Labels wie „Wasser / Rohr / WC“ sind kein Vorgangs-Titel. */
function isMeldeBereichFallbackTitel(t: string): boolean {
  const n = t.trim().toLowerCase();
  if (!n) return false;
  if (n.includes(" / ")) return true;
  if (n === "wasser / rohr / wc" || n.includes("rohr / wc")) return true;
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
 * Sprechender List-/Detail-Titel für Melde-Vorgänge (Mieter-Melde-Flow).
 * Dringlichkeit bleibt am Status-Chip (NOTFALL) — nicht im Titel wiederholen.
 */
export function buildMeldeVorgangTitel(input: MeldeVorgangTitelInput): string {
  const answers = answersFromFunnel(input.funnelDaten);
  const bereichId = meldeBereichFromFunnel(input.funnelDaten, input.bereiche);
  const bereichLabel = bereichId
    ? meldeBereichLabel(bereichId)
    : formatAnfrageGewerk(input.bereiche);

  // Expliziter Melde-Bereich hat Vorrang (vermeidet tropft→Heizung-Kollision)
  const ursachenBereich =
    bereichId ??
    resolveMeldeUrsachenBereich({
      answers,
      bereichLabel,
      bereiche: input.bereiche,
    });

  let core = "";
  if (ursachenBereich) {
    core = meldeSchadenKurz(ursachenBereich, answers).trim();
  }

  if (!core || isGenericTitel(core) || isMeldeBereichFallbackTitel(core)) {
    const vorhaben = formatVorhabenTitel(
      input.situation,
      input.bereiche,
      input.funnelDaten
    );
    core =
      firstMeaningfulLine(input.beschreibung) ||
      (bereichLabel && !isMeldeBereichFallbackTitel(bereichLabel)
        ? bereichLabel
        : null) ||
      (vorhaben !== "Vorgang" ? vorhaben : null) ||
      titelFromFunnelLeistungen(input.funnelDaten) ||
      "Vorgang";
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

/** Leistungstitel aus Funnel (CRM was_zeilen / Positionen) — Fallback statt „Vorgang“. */
export function titelFromFunnelLeistungen(funnelDaten: unknown): string | null {
  if (funnelDaten == null) return null;

  const pools: unknown[] = [];
  if (Array.isArray(funnelDaten)) {
    pools.push(...funnelDaten);
  } else if (typeof funnelDaten === "object") {
    const f = funnelDaten as Record<string, unknown>;
    if (Array.isArray(f.was_zeilen)) pools.push(...f.was_zeilen);
    if (Array.isArray(f.positionen)) pools.push(...f.positionen);
    if (Array.isArray(f.leistungen)) pools.push(...f.leistungen);
    for (const key of ["items", "zeilen"] as const) {
      if (Array.isArray(f[key])) pools.push(...(f[key] as unknown[]));
    }
  } else {
    return null;
  }

  const titles: string[] = [];
  for (const row of pools) {
    if (!row || typeof row !== "object") continue;
    const t = String(
      (row as { titel?: unknown; title?: unknown; leistung?: unknown }).titel ??
        (row as { title?: unknown }).title ??
        (row as { leistung?: unknown }).leistung ??
        ""
    ).trim();
    if (t && !isGenericTitel(t)) titles.push(t);
  }
  if (!titles.length) return null;
  if (titles.length === 1) return titles[0]!.slice(0, 80);
  return `${titles[0]!.slice(0, 50)} (+${titles.length - 1})`;
}

/** Situation · Gewerk — wie normale Anfragen / HV-selbst angelegte Vorgänge. */
export function formatVorhabenTitel(
  situation?: string | null,
  bereiche?: string[] | null,
  funnelDaten?: unknown
): string {
  const vorhabenLabel = labelSituation(situation);
  const vorhaben = vorhabenLabel !== "—" ? vorhabenLabel : undefined;
  const gewerk = formatAnfrageGewerk(bereiche);
  const fromFunnel = titelFromFunnelLeistungen(funnelDaten);
  return (
    [vorhaben, gewerk].filter(Boolean).join(" · ") ||
    fromFunnel ||
    "Vorgang"
  );
}

/**
 * Ob Lead eine echte Mieter-Meldung ist (sprechender Melde-Titel).
 * HV-eigene Erfassung (Neuer Vorgang) → false → Vorhaben-Titel wie Anfragen.
 */
export function leadIstMeldeTitelQuelle(lead: {
  anlass?: string | null;
  kanal?: string | null;
  funnelDaten?: unknown;
  erfassung_von?: string | null;
}): boolean {
  const erfassung = (lead.erfassung_von ?? "").toLowerCase().trim();
  if (erfassung === "organisation") return false;

  const kanal = (lead.kanal ?? "").toLowerCase().trim();
  /** HV/Org legt selbst an — kein Melde-Titel („Meldung“). */
  if (
    kanal === "hv_direkt" ||
    kanal === "hv_manuell" ||
    kanal === "hv_katalog" ||
    kanal === "org_service"
  ) {
    return false;
  }

  if (kanal === "hv_melder_link" || kanal === "hv_einladung") return true;
  if (erfassung === "melder") return true;
  if (lead.anlass === "meldung") return true;

  if (lead.funnelDaten && typeof lead.funnelDaten === "object") {
    const f = lead.funnelDaten as Record<string, unknown>;
    const quelle = String(f.quelle ?? "").toLowerCase();
    if (
      quelle === "hv_direkt" ||
      quelle === "hv_manuell" ||
      quelle === "hv_katalog" ||
      quelle === "org_service"
    ) {
      return false;
    }
    if (f.melde_bereich || f.melde_kategorie) return true;
    if (f.answers || f.antworten) return true;
    const fd = f.fachdetails;
    if (fd && typeof fd === "object" && !Array.isArray(fd)) {
      const nested = (fd as { fachdetailAnswers?: unknown }).fachdetailAnswers;
      if (nested && typeof nested === "object") return true;
    }
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
  neueMeldung: "Neue Meldung: {titel}",
  meldungEingegangen: "Ihre Meldung ist eingegangen",
  meldungEingegangenBody:
    "Wir haben Ihre Meldung erhalten und kümmern uns darum.",
  statusWechsel: "Status: {titel}",
  neuesAngebot: "Angebot bereit: {titel}",
  neuesAngebotBody:
    "„{titel}“ liegt im Portal bereit — bitte annehmen oder ablehnen.",
  neuesAngebotUnterSchwelleBody:
    "„{titel}“ liegt unter Ihrer Freigabeschwelle — wir kümmern uns direkt um den Auftrag.",
  partnerErledigt: "Erledigt: {titel}",
  partnerTeilabschluss: "Teilabschluss: {titel}",
  bautagebuch: "Update: {titel}",
  kostenfreigabe: "Kostenfreigabe nötig",
} as const;
