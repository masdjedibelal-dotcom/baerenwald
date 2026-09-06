/**
 * Vorgangs-Titel — gleiche Priorität wie CRM (`baerenwald-system` vorgang-anzeige-titel).
 * Portal und CRM sollen denselben sichtbaren Titel nutzen.
 */

import { labelBereich, labelSituation } from "@/lib/lead-funnel-labels";
import { parseWizardMetaFromNotizen } from "@/lib/portal/portal-display";

export type VorgangAnzeigeTitelAngebot = {
  leistungsumfang?: string | null;
  notizen?: string | null;
};

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

/** Titel aus Angebot (Leistungsumfang / Wizard), sonst Situation · Bereich. */
export function angebotTitelOderSituationBereich(opts: {
  angebot?: VorgangAnzeigeTitelAngebot | null;
  situation?: string | null;
  bereiche?: string[] | null;
  fallback?: string | null;
}): string {
  const wm = opts.angebot
    ? parseWizardMetaFromNotizen(opts.angebot.notizen)
    : null;
  const angebotTitel =
    opts.angebot?.leistungsumfang?.trim() ||
    wm?.leistungsumfang?.trim() ||
    "";
  if (angebotTitel) return angebotTitel;

  const fromLead = situationBereichTitel(opts.situation, opts.bereiche);
  if (fromLead) return fromLead;

  return opts.fallback?.trim() || "Vorgang";
}

/**
 * Akte / Portal-Liste: Angebot → Auftrag → Rechnung → Anfrage (Situation · Bereich).
 */
export function resolveAkteVorgangTitel(opts: {
  angebot?: VorgangAnzeigeTitelAngebot | null;
  auftragTitel?: string | null;
  rechnungTitel?: string | null;
  situation?: string | null;
  bereiche?: string[] | null;
  fallback?: string | null;
}): string {
  const wm = opts.angebot
    ? parseWizardMetaFromNotizen(opts.angebot.notizen)
    : null;
  const angebotTitel =
    opts.angebot?.leistungsumfang?.trim() ||
    wm?.leistungsumfang?.trim() ||
    "";
  if (angebotTitel) return angebotTitel;

  const auftragTitel = opts.auftragTitel?.trim();
  if (auftragTitel) return auftragTitel;

  const rechnungTitel = opts.rechnungTitel?.trim();
  if (rechnungTitel) return rechnungTitel;

  const anfrage = situationBereichTitel(opts.situation, opts.bereiche);
  if (anfrage) return anfrage;

  return opts.fallback?.trim() || "Vorgang";
}
