import type {
  PartnerAnfrageItem,
  PartnerAuftragItem,
} from "@/lib/partner/get-partner-data";
import type { PortalAnfrageLeadSource } from "@/lib/portal/portal-anfrage-display";
import { objektPlzOrt } from "@/lib/portal/portal-detail-item";
import type { PortalObjekt } from "@/lib/portal/portal-objekt";
import { isPrivatPortalKontext } from "@/lib/portal/portal-titel";
import { labelSituation } from "@/lib/lead-funnel-labels";
import {
  buildMeldeVorgangTitel,
  leadIstMeldeTitelQuelle,
} from "@/lib/org/melde-vorgang-titel";
import { resolveAkteVorgangTitel } from "@/lib/vorgang/vorgang-anzeige-titel";

/**
 * Generisches „Angebot …“ entfernen — bleibt der eingegebene Rest
 * (z. B. „Angebot Bad — Firma“ → „Bad — Firma“).
 * Reine Dokumentnr. („Angebot ANG-12“) → leer.
 */
export function stripGenericAngebotTitelPrefix(
  t: string | null | undefined
): string {
  const raw = t?.trim() ?? "";
  if (!raw) return "";
  if (/^angebot$/i.test(raw)) return "";
  // Nur Nummer/Slug hinter „Angebot“
  if (/^angebot\s+[A-Z0-9][\w./-]{0,48}$/i.test(raw)) return "";
  return raw.replace(/^angebot\s*[—\-|:·]?\s*/i, "").trim();
}

/** CRM-/Gewerk-Slug oder leerer Dokument-Titel — kein sprechender Listen-Titel. */
function isBareGewerkSlug(t: string | null | undefined): boolean {
  const s = stripGenericAngebotTitelPrefix(t);
  if (!s || s === "Projekt" || s === "Auftrag" || s === "Vorgang") return true;
  // Ein Token, nur a–z/_, typisch CRM-Slug
  if (/^[a-z][a-z0-9_]{1,32}$/.test(s)) return true;
  return false;
}

function meldeTitelFromLead(
  lead?: PortalAnfrageLeadSource | null
): string | null {
  if (!lead) return null;
  const leadExtra = lead as PortalAnfrageLeadSource & {
    kanal?: string | null;
    notizen?: string | null;
  };
  const isMelde = leadIstMeldeTitelQuelle({
    anlass: leadExtra.anlass,
    kanal: leadExtra.kanal,
    funnelDaten: leadExtra.funnel_daten,
    erfassung_von: leadExtra.erfassung_von,
  });
  if (!isMelde && !leadExtra.funnel_daten) return null;

  const t = buildMeldeVorgangTitel({
    situation: leadExtra.situation,
    bereiche: leadExtra.bereiche,
    funnelDaten: leadExtra.funnel_daten,
    beschreibung: leadExtra.kontakt_nachricht ?? leadExtra.notizen ?? null,
  }).trim();
  if (!t || t === "Meldung" || isBareGewerkSlug(t)) return null;
  return t;
}

export type PartnerListenTitelInput = {
  gewerk_name?: string | null;
  gewerk_names?: string[];
  plz?: string | null;
  ort?: string | null;
  lead?: PortalAnfrageLeadSource | null;
  objekt?: PortalObjekt | null;
  /** Angebots-Felder wie CRM / Kundenportal (`resolveAkteVorgangTitel`). */
  angebot?: {
    leistungsumfang?: string | null;
    notizen?: string | null;
  } | null;
  /** Auftragstitel (nach Angebot in der CRM-Priorität). */
  auftragTitel?: string | null;
  /** Eingegebener Angebots-/Wizard-Titel oder Leistungsumfang (Fallback). */
  fallbackTitel?: string | null;
};

function resolveGewerkLabel(
  gewerk_name?: string | null,
  gewerk_names?: string[]
): string | undefined {
  const single = gewerk_name?.trim();
  if (single && single !== "Gewerk") return single;

  const names = Array.from(
    new Set(
      (gewerk_names ?? [])
        .map((n) => n?.trim())
        .filter((n): n is string => Boolean(n && n !== "Gewerk"))
    )
  );
  if (names.length === 1) return names[0];
  if (names.length > 1) {
    const head = names.slice(0, 2).join(" / ");
    return names.length > 2 ? `${head} …` : head;
  }

  return single && single !== "Gewerk" ? single : undefined;
}

function resolveOrtLabel(opts: PartnerListenTitelInput): string | undefined {
  const lead = opts.lead;
  const objekt = lead?.objekt ?? opts.objekt ?? null;

  const privat = lead
    ? isPrivatPortalKontext({
        situation: lead.situation,
      })
    : true;

  const objektName = objekt?.name?.trim();
  if (!privat && objektName && objektName !== "Objekt") {
    return objektName;
  }

  const { plz, ort } = objektPlzOrt(objekt, lead?.plz ?? opts.plz);
  const plzClean = plz !== "—" ? plz : opts.plz?.trim();
  const ortClean = ort !== "—" ? ort : opts.ort?.trim();
  const parts = [plzClean, ortClean].filter((p): p is string =>
    Boolean(p && p !== "—")
  );
  return parts.length ? parts.join(" ") : undefined;
}

function resolveSituationLabel(
  lead?: PortalAnfrageLeadSource | null
): string | undefined {
  const labeled = labelSituation(lead?.situation);
  return labeled !== "—" ? labeled : undefined;
}

function partnerContextFallback(opts: PartnerListenTitelInput): string {
  const melde = meldeTitelFromLead(opts.lead);
  if (melde) return melde;

  const lead = opts.lead;
  const situation = resolveSituationLabel(lead);
  const gewerk = resolveGewerkLabel(opts.gewerk_name, opts.gewerk_names);
  const ort = resolveOrtLabel(opts);

  const parts = [situation, gewerk, ort].filter(
    (p): p is string => Boolean(p) && !isBareGewerkSlug(p)
  );
  if (parts.length) return parts.join(" — ");
  if (gewerk && ort && !isBareGewerkSlug(gewerk)) {
    return `${gewerk} — ${ort}`;
  }
  if (ort && gewerk && isBareGewerkSlug(gewerk)) {
    return ort;
  }
  if (situation) return situation;
  return "Vorgang";
}

/**
 * Partner-Listen-/Detail-Titel — gleiche Priorität wie CRM / Kundenportal:
 * Leistungsumfang → Auftragstitel → Situation · Bereich → Melde-/Kontext-Fallback.
 */
export function resolvePartnerListenTitel(opts: PartnerListenTitelInput): string {
  const eingegeben = stripGenericAngebotTitelPrefix(opts.fallbackTitel);
  const angebotLeistung =
    opts.angebot?.leistungsumfang?.trim() ||
    (eingegeben && !opts.auftragTitel && !isBareGewerkSlug(eingegeben)
      ? eingegeben
      : "") ||
    "";

  const crmTitel = resolveAkteVorgangTitel({
    angebot: {
      leistungsumfang: angebotLeistung || opts.angebot?.leistungsumfang,
      notizen: opts.angebot?.notizen,
    },
    auftragTitel: opts.auftragTitel?.trim() || null,
    situation: opts.lead?.situation,
    bereiche: opts.lead?.bereiche,
    fallback: partnerContextFallback(opts),
  });

  const cleaned = stripGenericAngebotTitelPrefix(crmTitel);
  if (cleaned && !isBareGewerkSlug(cleaned) && !/^angebot\b/i.test(cleaned)) {
    return cleaned;
  }
  if (
    crmTitel &&
    !/^angebot\s+[A-Z0-9]/i.test(crmTitel.trim()) &&
    !isBareGewerkSlug(crmTitel)
  ) {
    return crmTitel;
  }

  return partnerContextFallback(opts);
}

export function resolvePartnerListenTitelFromAnfrage(
  item: Pick<
    PartnerAnfrageItem,
    "gewerk_name" | "plz" | "ort" | "lead" | "angebot_titel" | "crm_leistungsumfang"
  >
): string {
  return resolvePartnerListenTitel({
    gewerk_name: item.gewerk_name,
    plz: item.plz,
    ort: item.ort,
    lead: item.lead,
    angebot: item.crm_leistungsumfang
      ? { leistungsumfang: item.crm_leistungsumfang }
      : null,
    fallbackTitel: item.angebot_titel,
  });
}

export function resolvePartnerListenTitelFromAuftrag(
  item: Pick<
    PartnerAuftragItem,
    "plz" | "ort" | "lead" | "titel" | "positionen"
  >
): string {
  return resolvePartnerListenTitel({
    gewerk_names: item.positionen.map((p) => p.gewerk_name),
    plz: item.plz,
    ort: item.ort,
    lead: item.lead,
    auftragTitel: item.titel,
    fallbackTitel: item.titel,
  });
}

/**
 * Detail-Überschrift Auftrag: gleicher Titel wie die Vorgangs-Liste (`listen_titel`).
 */
export function resolvePartnerDetailTitelFromAuftrag(
  item: Pick<
    PartnerAuftragItem,
    "titel" | "listen_titel" | "plz" | "ort" | "lead" | "positionen"
  >
): string {
  const listen = stripGenericAngebotTitelPrefix(item.listen_titel);
  if (listen && !isBareGewerkSlug(listen)) return listen;

  const fromLead = resolvePartnerListenTitelFromAuftrag(item);
  if (fromLead && !isBareGewerkSlug(fromLead)) return fromLead;

  const titel = stripGenericAngebotTitelPrefix(item.titel);
  if (titel && !isBareGewerkSlug(titel)) return titel;
  return fromLead !== "Vorgang" ? fromLead : listen || "Auftrag";
}

/**
 * Detail-Überschrift für Anfragen: gleicher Titel wie die Liste (`listen_titel`).
 */
export function resolvePartnerDetailTitelFromAnfrage(
  item: Pick<
    PartnerAnfrageItem,
    | "angebot_titel"
    | "listen_titel"
    | "gewerk_name"
    | "plz"
    | "ort"
    | "lead"
    | "crm_leistungsumfang"
  >
): string {
  const listen = stripGenericAngebotTitelPrefix(item.listen_titel);
  if (listen && !isBareGewerkSlug(listen)) return listen;

  const fromLead = resolvePartnerListenTitelFromAnfrage(item);
  if (fromLead && !isBareGewerkSlug(fromLead)) return fromLead;

  const titel = stripGenericAngebotTitelPrefix(item.angebot_titel);
  if (titel && !isBareGewerkSlug(titel)) return titel;
  return fromLead !== "Vorgang" ? fromLead : listen || "Projekt";
}
