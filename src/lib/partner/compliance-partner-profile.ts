export type ComplianceEbene = "allgemein" | "meister" | "leistung";

export type PartnerGewerkRow = {
  slug: string;
  name?: string | null;
  ausfuehrung?: string | null;
  ist_bauleistung?: boolean | null;
};

export type PartnerComplianceTypEbene = {
  slug: string;
  compliance_ebene?: string | null;
  scope?: string | null;
  nur_bei_bauleistung?: boolean | null;
  gewerk_slugs?: string[] | null;
  aktiv?: boolean | null;
  mehrfach_erlaubt?: boolean | null;
  pflicht_fuer_fachbetriebe?: boolean | null;
  pflicht_bauprojekt?: boolean | null;
  sort_order?: number | null;
};

export const COMPLIANCE_EBENE_LABELS: Record<ComplianceEbene, string> = {
  allgemein: "Unterlagen",
  meister: "Meister & Fachbetrieb",
  leistung: "Leistungsvertrag & Auftrag",
};

export function normalizeComplianceEbene(typ: PartnerComplianceTypEbene): ComplianceEbene {
  const ebene = typ.compliance_ebene;
  if (ebene === "meister" || ebene === "leistung") return ebene;
  if (typ.scope === "bauprojekt" || typ.scope === "gewerk") return "leistung";
  return "allgemein";
}

function normalizeAusfuehrung(v: string | null | undefined): "eigen" | "fachbetrieb" | "beides" {
  if (v === "fachbetrieb" || v === "beides") return v;
  return "eigen";
}

export function istFachbetriebGewerk(gewerk: PartnerGewerkRow | undefined): boolean {
  if (!gewerk) return false;
  return normalizeAusfuehrung(gewerk.ausfuehrung) !== "eigen";
}

export function partnerGewerkSlugs(handwerkerGewerke: string[] | null | undefined): string[] {
  return (handwerkerGewerke ?? []).map((s) => s.trim()).filter(Boolean);
}

export function partnerLeistetBauleistung(
  handwerkerGewerke: string[] | null | undefined,
  alleGewerke: PartnerGewerkRow[]
): boolean {
  const slugs = new Set(partnerGewerkSlugs(handwerkerGewerke));
  if (!slugs.size) return true;
  return alleGewerke.some((g) => slugs.has(g.slug) && g.ist_bauleistung !== false);
}

export function partnerHatMeisterGewerke(
  handwerkerGewerke: string[] | null | undefined,
  alleGewerke: PartnerGewerkRow[]
): boolean {
  const slugs = partnerGewerkSlugs(handwerkerGewerke);
  return slugs.some((slug) => istFachbetriebGewerk(alleGewerke.find((x) => x.slug === slug)));
}

function typPasstZuGewerken(typ: PartnerComplianceTypEbene, gewerkSlugs: string[]): boolean {
  const filter = typ.gewerk_slugs?.filter(Boolean) ?? [];
  if (!filter.length) return true;
  if (!gewerkSlugs.length) return false;
  const set = new Set(gewerkSlugs);
  return filter.some((s) => set.has(s));
}

export function typGiltFuerPartner(
  typ: PartnerComplianceTypEbene,
  handwerkerGewerke: string[] | null | undefined,
  alleGewerke: PartnerGewerkRow[]
): boolean {
  if (typ.aktiv === false) return false;
  const ebene = normalizeComplianceEbene(typ);
  const slugs = partnerGewerkSlugs(handwerkerGewerke);
  const hatBau = partnerLeistetBauleistung(slugs, alleGewerke);
  const hatMeister = partnerHatMeisterGewerke(slugs, alleGewerke);

  if (ebene === "meister" && !hatMeister) return false;
  if (typ.nur_bei_bauleistung && !hatBau) return false;
  if (!typPasstZuGewerken(typ, slugs)) return false;
  return true;
}

export function typGiltFuerProjekt(
  typ: PartnerComplianceTypEbene,
  projektGewerkSlugs: string[],
  handwerkerGewerke: string[] | null | undefined,
  alleGewerke: PartnerGewerkRow[]
): boolean {
  if (typ.aktiv === false) return false;
  if (normalizeComplianceEbene(typ) !== "leistung") return false;
  const hwSlugs = partnerGewerkSlugs(handwerkerGewerke);
  const relevantSlugs = projektGewerkSlugs.length ? projektGewerkSlugs : hwSlugs;
  const hatBau =
    relevantSlugs.some((s) => {
      const g = alleGewerke.find((x) => x.slug === s);
      return g?.ist_bauleistung !== false;
    }) || partnerLeistetBauleistung(hwSlugs, alleGewerke);

  if (typ.nur_bei_bauleistung && !hatBau) return false;
  return typPasstZuGewerken(typ, relevantSlugs);
}

export function istPflichtFuerPartner(
  typ: PartnerComplianceTypEbene,
  handwerkerGewerke: string[] | null | undefined,
  alleGewerke: PartnerGewerkRow[]
): boolean {
  if (!typGiltFuerPartner(typ, handwerkerGewerke, alleGewerke)) return false;
  return typ.pflicht_fuer_fachbetriebe === true;
}

export function istPflichtFuerProjekt(
  typ: PartnerComplianceTypEbene,
  projektGewerkSlugs: string[],
  handwerkerGewerke: string[] | null | undefined,
  alleGewerke: PartnerGewerkRow[]
): boolean {
  if (!typGiltFuerProjekt(typ, projektGewerkSlugs, handwerkerGewerke, alleGewerke)) return false;
  return typ.pflicht_bauprojekt === true;
}

export function filterPartnerComplianceTypen<T extends PartnerComplianceTypEbene>(
  typen: T[],
  ebene: ComplianceEbene,
  handwerkerGewerke: string[] | null | undefined,
  alleGewerke: PartnerGewerkRow[]
): T[] {
  return typen
    .filter(
      (t) =>
        normalizeComplianceEbene(t) === ebene &&
        typGiltFuerPartner(t, handwerkerGewerke, alleGewerke) &&
        !t.mehrfach_erlaubt
    )
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

export function filterLeistungComplianceTypen<T extends PartnerComplianceTypEbene>(
  typen: T[],
  projektGewerkSlugs: string[],
  handwerkerGewerke: string[] | null | undefined,
  alleGewerke: PartnerGewerkRow[]
): T[] {
  return typen
    .filter(
      (t) =>
        normalizeComplianceEbene(t) === "leistung" &&
        typGiltFuerProjekt(t, projektGewerkSlugs, handwerkerGewerke, alleGewerke)
    )
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

export function complianceAblaufHinweis(
  status: "fehlend" | "ok" | "warnung" | "abgelaufen",
  gueltigBis: string | null | undefined
): string | null {
  if (status === "fehlend") return null;
  if (status === "abgelaufen") return "Abgelaufen";
  if (status === "warnung" && gueltigBis) {
    try {
      const d = new Date(gueltigBis);
      return `Läuft ab am ${d.toLocaleDateString("de-DE")}`;
    } catch {
      return "Läuft bald ab";
    }
  }
  if (status === "warnung") return "In Prüfung oder läuft bald ab";
  return null;
}
