import {
  COMPLIANCE_EBENE_LABELS,
  type ComplianceEbene,
} from "@/lib/partner/compliance-partner-profile";
import { mergeNachunternehmerComplianceItems } from "@/lib/partner/nachunternehmervertrag-compliance";
import type { PartnerComplianceItem } from "@/lib/partner/partner-compliance";

export const RAHMENVERTRAG_TYP_SLUG = "rahmenvertrag";
export const HANDWERKSKARTE_TYP_SLUG = "handwerkskarte";

/** Nur Handwerkskarte — bleibt unter Rahmenvertrag im Profil. */
export function filterProfilStammCompliance(
  items: PartnerComplianceItem[]
): PartnerComplianceItem[] {
  return items.filter((i) => i.slug === HANDWERKSKARTE_TYP_SLUG);
}

/** Stamm-Unterlagen je Bauauftrag (ohne Handwerkskarte & Rahmenvertrag). */
export function filterBauauftragStammCompliance(
  items: PartnerComplianceItem[]
): PartnerComplianceItem[] {
  return items.filter(
    (i) => i.slug !== HANDWERKSKARTE_TYP_SLUG && i.slug !== RAHMENVERTRAG_TYP_SLUG
  );
}

/** Bauprojekt = mindestens ein Auftrags-Gewerk mit gewerke.ist_bauleistung = true. */
export function isPartnerBauprojektAuftrag(input: {
  ist_bauprojekt?: boolean | null;
  compliance_projekt?: PartnerComplianceItem[] | null;
}): boolean {
  if (input.ist_bauprojekt != null) return input.ist_bauprojekt;
  return (input.compliance_projekt?.length ?? 0) > 0;
}

/** Nachweise laut Projekt-Nachunternehmervertrag (Stamm + auftragsspezifisch). */
export function buildBauauftragComplianceItems(
  stamm: PartnerComplianceItem[] | undefined,
  projekt: PartnerComplianceItem[] | undefined,
  bauauftrag?: PartnerComplianceItem[] | undefined
): PartnerComplianceItem[] {
  if (bauauftrag?.length) return [...bauauftrag];
  return mergeNachunternehmerComplianceItems(stamm, projekt);
}

export type ComplianceStammSummary = {
  gesamt: number;
  pflichtOffen: number;
  inPruefung: number;
  ablaufWarnung: number;
  abgelaufen: number;
  erledigt: number;
};

export function summarizeComplianceStamm(
  items: PartnerComplianceItem[]
): ComplianceStammSummary {
  let pflichtOffen = 0;
  let inPruefung = 0;
  let ablaufWarnung = 0;
  let abgelaufen = 0;
  let erledigt = 0;

  for (const item of items) {
    if (item.status === "in_pruefung") inPruefung += 1;
    else if (item.status === "ablauf_warnung") ablaufWarnung += 1;
    else if (item.status === "abgelaufen") abgelaufen += 1;
    else if (item.status === "erledigt") erledigt += 1;

    if (
      item.pflicht &&
      item.status !== "erledigt" &&
      item.status !== "in_pruefung" &&
      item.status !== "ablauf_warnung"
    ) {
      pflichtOffen += 1;
    }
  }

  return {
    gesamt: items.length,
    pflichtOffen,
    inPruefung,
    ablaufWarnung,
    abgelaufen,
    erledigt,
  };
}

export function gruppeComplianceItems(
  items: PartnerComplianceItem[]
): Array<{ kategorie: string; items: PartnerComplianceItem[] }> {
  const map = new Map<string, PartnerComplianceItem[]>();
  for (const item of items) {
    const key =
      item.kategorie?.trim() ||
      COMPLIANCE_EBENE_LABELS[item.ebene as ComplianceEbene] ||
      "Weitere";
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return Array.from(map.entries()).map(([kategorie, grouped]) => ({
    kategorie,
    items: grouped,
  }));
}

export type PartnerRahmenvertrag = {
  id: string;
  vertrags_nr: string | null;
  status: string;
  pdf_url: string | null;
  pdf_signed_url: string | null;
  signiert_am: string | null;
  portal_akzeptiert_am: string | null;
};

export function rahmenvertragHatPdf(
  rahmen: PartnerRahmenvertrag | null | undefined
): boolean {
  if (!rahmen?.pdf_url?.trim()) return false;
  const st = rahmen.status.toLowerCase();
  return (
    st === "pdf_erzeugt" ||
    st === "unterschrieben" ||
    st === "signiert" ||
    Boolean(rahmen.pdf_signed_url)
  );
}

/** Portal-Onboarding: RV-PDF liegt vor, Partner hat noch nicht im Portal akzeptiert. */
export function rahmenvertragBrauchtPortalAkzeptanz(
  rahmen: PartnerRahmenvertrag | null | undefined
): boolean {
  if (!rahmenvertragHatPdf(rahmen) || !rahmen) return false;
  return !rahmen.portal_akzeptiert_am;
}

/** Registrierung/Portal-Annahme zählt als erledigt — nicht „In Prüfung“. */
export function applyRahmenvertragPortalAkzeptanz(
  items: PartnerComplianceItem[],
  rahmen: PartnerRahmenvertrag | null | undefined
): PartnerComplianceItem[] {
  if (!rahmen?.portal_akzeptiert_am) return items;
  return items.map((item) =>
    item.slug === RAHMENVERTRAG_TYP_SLUG
      ? { ...item, status: "erledigt", ablauf_hinweis: null }
      : item
  );
}

export function rahmenvertragErfuellt(
  stammItems: PartnerComplianceItem[],
  rahmen: PartnerRahmenvertrag | null | undefined
): boolean {
  if (rahmen?.portal_akzeptiert_am) return true;
  const doc = stammItems.find((i) => i.slug === RAHMENVERTRAG_TYP_SLUG);
  if (doc?.status === "erledigt" || doc?.status === "in_pruefung") return true;
  if (!rahmen?.pdf_url?.trim()) {
    const st = rahmen?.status?.toLowerCase() ?? "";
    return st === "portal_akzeptiert";
  }
  const st = rahmen.status.toLowerCase();
  return (
    st === "portal_akzeptiert" ||
    st === "pdf_erzeugt" ||
    st === "unterschrieben" ||
    st === "signiert"
  );
}

export type PartnerOffeneLeistungsUnterlage = {
  auftrag_id: string;
  auftrag_titel: string;
  offene_pflicht: number;
  items: PartnerComplianceItem[];
};

export function buildOffeneLeistungsUnterlagen(
  entries: Array<{
    auftrag_id: string;
    auftrag_titel: string;
    items: PartnerComplianceItem[];
  }>
): PartnerOffeneLeistungsUnterlage[] {
  return entries
    .map((entry) => {
      const offen = entry.items.filter(
        (i) =>
          i.pflicht &&
          i.status !== "erledigt" &&
          i.status !== "in_pruefung" &&
          i.status !== "ablauf_warnung"
      );
      if (!offen.length) return null;
      return {
        auftrag_id: entry.auftrag_id,
        auftrag_titel: entry.auftrag_titel,
        offene_pflicht: offen.length,
        items: offen,
      };
    })
    .filter((x): x is PartnerOffeneLeistungsUnterlage => x != null);
}
