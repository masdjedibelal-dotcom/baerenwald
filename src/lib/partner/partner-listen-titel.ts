import type {
  PartnerAnfrageItem,
  PartnerAuftragItem,
} from "@/lib/partner/get-partner-data";
import type { PortalAnfrageLeadSource } from "@/lib/portal/portal-anfrage-display";
import { objektPlzOrt } from "@/lib/portal/portal-detail-item";
import type { PortalObjekt } from "@/lib/portal/portal-objekt";
import { isPrivatPortalKontext } from "@/lib/portal/portal-titel";
import { labelSituation } from "@/lib/lead-funnel-labels";

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

/** Einheitlicher Listen-/Detail-Titel: „Situation — Gewerk — PLZ Ort“. */
export function resolvePartnerListenTitel(opts: PartnerListenTitelInput): string {
  const situation = resolveSituationLabel(opts.lead);
  const gewerk = resolveGewerkLabel(opts.gewerk_name, opts.gewerk_names);
  const ort = resolveOrtLabel(opts);
  const fallback = opts.fallbackTitel?.trim();

  const parts = [situation, gewerk, ort].filter((p): p is string => Boolean(p));
  if (parts.length) return parts.join(" — ");
  if (fallback) return fallback;
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

/** Detail-Überschrift: CRM-Auftragstitel, sonst Listen-Titel. */
export function resolvePartnerDetailTitelFromAuftrag(
  item: Pick<PartnerAuftragItem, "titel" | "listen_titel">
): string {
  const titel = item.titel?.trim();
  if (titel && titel !== "Auftrag") return titel;
  return item.listen_titel;
}

/** Detail-Überschrift für Anfragen: CRM-Angebotstitel, sonst Listen-Titel. */
export function resolvePartnerDetailTitelFromAnfrage(
  item: Pick<PartnerAnfrageItem, "angebot_titel" | "listen_titel">
): string {
  const titel = item.angebot_titel?.trim();
  if (titel && titel !== "Angebot") return titel;
  return item.listen_titel;
}
