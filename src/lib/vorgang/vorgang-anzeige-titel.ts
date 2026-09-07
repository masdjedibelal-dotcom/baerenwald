/**
 * Vorgangs-Titel — gleiche Priorität wie CRM (`baerenwald-system` vorgang-anzeige-titel).
 * Portal und CRM sollen denselben sichtbaren Titel nutzen.
 */

import { labelBereich, labelSituation } from "@/lib/lead-funnel-labels";
import { parseWizardMetaFromNotizen } from "@/lib/portal/portal-display";

export type VorgangAnzeigeTitelAngebot = {
  leistungsumfang?: string | null;
  notizen?: string | null;
  titel?: string | null;
};

/**
 * Platzhalter / PosBoard-Defaults / Slugs — kein sprechender Vorgangs-Titel.
 * (z. B. „Leistungen“, „Auftrag“, „Direktauftrag — sanitär“)
 */
export function isPlaceholderVorgangTitel(
  t: string | null | undefined
): boolean {
  const raw = t?.trim() ?? "";
  if (!raw) return true;
  const n = raw.toLowerCase();
  if (
    n === "leistungen" ||
    n === "leistung" ||
    n === "auftrag" ||
    n === "projekt" ||
    n === "vorgang" ||
    n === "meldung" ||
    n === "angebot" ||
    n === "direktauftrag" ||
    n === "notfall" ||
    n === "einsatz"
  ) {
    return true;
  }
  // Reine Dok-Nr. / generisches „Angebot …“
  if (/^angebot(\s+[a-z0-9][\w./-]{0,48})?$/i.test(raw)) return true;
  // CRM-Slug (ein Token)
  if (/^[a-z][a-z0-9_]{1,40}$/.test(raw)) return true;
  // „Direktauftrag — sanitär“ / „Direktauftrag - elektro“
  if (/^direktauftrag\s*[—\-|:·]\s*[a-z0-9_]+$/i.test(raw)) return true;
  return false;
}

function angebotSprechenderTitel(
  angebot?: VorgangAnzeigeTitelAngebot | null
): string | null {
  if (!angebot) return null;
  const wm = parseWizardMetaFromNotizen(angebot.notizen);
  const candidates = [
    angebot.leistungsumfang,
    wm?.leistungsumfang,
    angebot.titel,
  ];
  for (const c of candidates) {
    const t = c?.trim() || "";
    if (t && !isPlaceholderVorgangTitel(t)) return t;
  }
  return null;
}

/** Situation + Bereich (Labels), z. B. „Reparatur · Sanitär“. */
export function situationBereichTitel(
  situation?: string | null,
  bereiche?: string[] | null
): string | null {
  const sit = situation?.trim();
  const sitLabel = sit ? labelSituation(sit) : "";
  const sitOk = sitLabel && sitLabel !== "—" ? sitLabel : "";
  const bereichLabel = (bereiche ?? [])
    .map((b) => {
      const l = b?.trim() ? labelBereich(b) : "";
      return l && l !== "—" ? l : "";
    })
    .filter(Boolean)
    .join(", ");
  const parts = [sitOk, bereichLabel].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** Titel aus Angebot (Leistungsumfang / Wizard / Titel), sonst Situation · Bereich. */
export function angebotTitelOderSituationBereich(opts: {
  angebot?: VorgangAnzeigeTitelAngebot | null;
  situation?: string | null;
  bereiche?: string[] | null;
  fallback?: string | null;
}): string {
  const angebotTitel = angebotSprechenderTitel(opts.angebot);
  if (angebotTitel) return angebotTitel;

  const fromLead = situationBereichTitel(opts.situation, opts.bereiche);
  if (fromLead) return fromLead;

  const fb = opts.fallback?.trim() || "";
  if (fb && !isPlaceholderVorgangTitel(fb)) return fb;
  return "Vorgang";
}

/**
 * Akte / Portal-Liste: Angebot → Auftrag → Rechnung → Anfrage (Situation · Bereich).
 * Platzhalter wie „Leistungen“ zählen nicht als Auftragstitel.
 * Nie Kundenname als Titel.
 */
export function resolveAkteVorgangTitel(opts: {
  angebot?: VorgangAnzeigeTitelAngebot | null;
  auftragTitel?: string | null;
  rechnungTitel?: string | null;
  situation?: string | null;
  bereiche?: string[] | null;
  fallback?: string | null;
}): string {
  const angebotTitel = angebotSprechenderTitel(opts.angebot);
  if (angebotTitel) return angebotTitel;

  const auftragTitel = opts.auftragTitel?.trim() || "";
  if (auftragTitel && !isPlaceholderVorgangTitel(auftragTitel)) {
    return auftragTitel;
  }

  const rechnungTitel = opts.rechnungTitel?.trim() || "";
  if (rechnungTitel && !isPlaceholderVorgangTitel(rechnungTitel)) {
    return rechnungTitel;
  }

  const anfrage = situationBereichTitel(opts.situation, opts.bereiche);
  if (anfrage) return anfrage;

  const fb = opts.fallback?.trim() || "";
  if (fb && !isPlaceholderVorgangTitel(fb)) return fb;
  return "Vorgang";
}
