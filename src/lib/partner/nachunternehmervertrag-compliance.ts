import { normalizeComplianceEbene } from "@/lib/partner/compliance-partner-profile";
import {
  itemFromTypForNachunternehmer,
  type PartnerComplianceItem,
  type PartnerComplianceTypRow,
  type PartnerDokumentRow,
} from "@/lib/partner/partner-compliance";

/**
 * Nachweise laut Projekt-Nachunternehmervertrag §6 / Anlage 1
 * (synchron zu PROJEKT_NU_ANLAGE_NACHWEISE im CRM).
 */
export const NACHUNTERMER_VERTRAG_COMPLIANCE_SLUGS = [
  "freistellung_13b",
  "freistellung_48b",
  "gewerbeanmeldung",
  "betriebshaftpflicht",
  "berufsgenossenschaft",
  "soka_bescheinigung",
  "personalliste",
  "ausweiskopien_mitarbeiter",
  "a1_bescheinigung",
  "benennung_bauleiter",
] as const;

export type NachunternehmerComplianceSlug =
  (typeof NACHUNTERMER_VERTRAG_COMPLIANCE_SLUGS)[number];

const NACHUNTERMER_SLUG_SET = new Set<string>(NACHUNTERMER_VERTRAG_COMPLIANCE_SLUGS);

export function isNachunternehmerComplianceSlug(slug: string): slug is NachunternehmerComplianceSlug {
  return NACHUNTERMER_SLUG_SET.has(slug);
}

function orderNachunternehmerItems(items: PartnerComplianceItem[]): PartnerComplianceItem[] {
  const bySlug = new Map(items.map((item) => [item.slug, item]));
  return NACHUNTERMER_VERTRAG_COMPLIANCE_SLUGS.map((slug) => bySlug.get(slug)).filter(
    (item): item is PartnerComplianceItem => Boolean(item)
  );
}

/** Stamm + projektbezogene Nachweise des Vertrags zusammenführen (projekt gewinnt bei gleichem slug). */
export function mergeNachunternehmerComplianceItems(
  stamm: PartnerComplianceItem[] | undefined,
  projekt: PartnerComplianceItem[] | undefined
): PartnerComplianceItem[] {
  const bySlug = new Map<string, PartnerComplianceItem>();
  for (const item of stamm ?? []) {
    if (isNachunternehmerComplianceSlug(item.slug)) {
      bySlug.set(item.slug, item);
    }
  }
  for (const item of projekt ?? []) {
    if (isNachunternehmerComplianceSlug(item.slug)) {
      bySlug.set(item.slug, item);
    }
  }
  return orderNachunternehmerItems(Array.from(bySlug.values()));
}

/** Vollständige Checkliste für Bauprojekte — fehlende Vertragspunkte aus dem Katalog ergänzen. */
export function buildBauprojektNachunternehmerCompliance(opts: {
  typen: PartnerComplianceTypRow[];
  dokumente: PartnerDokumentRow[];
  stamm: PartnerComplianceItem[];
  projekt: PartnerComplianceItem[];
  auftragId: string;
  ist_bauprojekt: boolean;
}): PartnerComplianceItem[] {
  if (!opts.ist_bauprojekt) return [];

  const bySlug = new Map(
    mergeNachunternehmerComplianceItems(opts.stamm, opts.projekt).map((item) => [
      item.slug,
      item,
    ])
  );

  for (const slug of NACHUNTERMER_VERTRAG_COMPLIANCE_SLUGS) {
    if (bySlug.has(slug)) continue;
    const typ = opts.typen.find((t) => t.slug === slug);
    if (!typ || typ.aktiv === false) continue;
    const ebene = normalizeComplianceEbene(typ);
    bySlug.set(
      slug,
      itemFromTypForNachunternehmer(typ, opts.dokumente, {
        pflicht: slug !== "a1_bescheinigung",
        auftragId: ebene === "leistung" ? opts.auftragId : null,
        ebene,
      })
    );
  }

  return orderNachunternehmerItems(Array.from(bySlug.values()));
}
