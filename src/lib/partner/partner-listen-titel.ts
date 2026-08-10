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

/** CRM-/Gewerk-Slug wie „sanitaer“ — kein sprechender Detail-Titel. */
function isBareGewerkSlug(t: string | null | undefined): boolean {
  const s = t?.trim() ?? "";
  if (!s || s === "Projekt" || s === "Auftrag" || s === "Angebot") return true;
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
  /** CRM-/Angebots-Titel als Fallback */
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
  const parts = [plzClean, ortClean].filter((p): p is string => Boolean(p && p !== "—"));
  return parts.length ? parts.join(" ") : undefined;
}

function resolveSituationLabel(lead?: PortalAnfrageLeadSource | null): string | undefined {
  const labeled = labelSituation(lead?.situation);
  return labeled !== "—" ? labeled : undefined;
}

/** Einheitlicher Listen-/Detail-Titel — Melde: sprechender Schadenstitel. */
export function resolvePartnerListenTitel(opts: PartnerListenTitelInput): string {
  const melde = meldeTitelFromLead(opts.lead);
  if (melde) return melde;

  const lead = opts.lead;
  const situation = resolveSituationLabel(lead);
  const gewerk = resolveGewerkLabel(opts.gewerk_name, opts.gewerk_names);
  const ort = resolveOrtLabel(opts);
  const fallback = opts.fallbackTitel?.trim();

  const parts = [situation, gewerk, ort].filter(
    (p): p is string => Boolean(p) && !isBareGewerkSlug(p)
  );
  if (parts.length) return parts.join(" — ");
  // Gewerk-Slug allein nur mit Ort — nie nacktes „sanitaer“
  if (gewerk && ort && !isBareGewerkSlug(gewerk)) {
    return `${gewerk} — ${ort}`;
  }
  if (ort && gewerk && isBareGewerkSlug(gewerk)) {
    return ort;
  }
  if (fallback && !isBareGewerkSlug(fallback)) return fallback;
  if (situation) return situation;
  return "Projekt";
}

export function resolvePartnerListenTitelFromAnfrage(
  item: Pick<
    PartnerAnfrageItem,
    "gewerk_name" | "plz" | "ort" | "lead" | "angebot_titel"
  >
): string {
  return resolvePartnerListenTitel({
    gewerk_name: item.gewerk_name,
    plz: item.plz,
    ort: item.ort,
    lead: item.lead,
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
  const listen = item.listen_titel?.trim();
  if (listen && !isBareGewerkSlug(listen)) return listen;

  const melde = meldeTitelFromLead(item.lead);
  if (melde) return melde;

  const fromLead = resolvePartnerListenTitelFromAuftrag(item);
  if (fromLead && !isBareGewerkSlug(fromLead)) return fromLead;

  const titel = item.titel?.trim();
  if (titel && !isBareGewerkSlug(titel)) return titel;
  return fromLead !== "Projekt" ? fromLead : listen || "Auftrag";
}

/**
 * Detail-Überschrift für Anfragen: gleicher Titel wie die Liste (`listen_titel`).
 */
export function resolvePartnerDetailTitelFromAnfrage(
  item: Pick<
    PartnerAnfrageItem,
    "angebot_titel" | "listen_titel" | "gewerk_name" | "plz" | "ort" | "lead"
  >
): string {
  const listen = item.listen_titel?.trim();
  if (listen && !isBareGewerkSlug(listen)) return listen;

  const melde = meldeTitelFromLead(item.lead);
  if (melde) return melde;

  const fromLead = resolvePartnerListenTitelFromAnfrage(item);
  if (fromLead && !isBareGewerkSlug(fromLead)) return fromLead;

  const titel = item.angebot_titel?.trim();
  if (titel && !isBareGewerkSlug(titel)) return titel;
  return fromLead !== "Projekt" ? fromLead : listen || "Projekt";
}
