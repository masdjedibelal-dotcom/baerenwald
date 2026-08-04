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

function gewerkSlugByName(
  gewerkName: string | null | undefined,
  alleGewerke: PartnerGewerkRow[]
): string | null {
  const name = gewerkName?.trim().toLowerCase();
  if (!name) return null;
  const hit = alleGewerke.find((g) => g.name?.trim().toLowerCase() === name);
  return hit?.slug ?? null;
}

/** Mindestens ein Gewerk **dieses Auftrags** ist explizit als Bauleistung markiert. */
export function projektHatBauleistung(
  projektGewerkSlugs: string[],
  alleGewerke: PartnerGewerkRow[]
): boolean {
  if (!projektGewerkSlugs.length) return false;
  return projektGewerkSlugs.some((slug) => {
    const g = alleGewerke.find((x) => x.slug === slug);
    return g?.ist_bauleistung === true;
  });
}

export function resolveProjektGewerkSlugsFromPositionen(
  positionen: Array<{ gewerk_slug?: string | null; gewerk_name?: string | null }>,
  alleGewerke: PartnerGewerkRow[]
): string[] {
  const slugs = new Set<string>();
  for (const pos of positionen) {
    const slug = pos.gewerk_slug?.trim();
    if (slug) {
      slugs.add(slug);
      continue;
    }
    const fromName = gewerkSlugByName(pos.gewerk_name, alleGewerke);
    if (fromName) slugs.add(fromName);
  }
  return Array.from(slugs);
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

  /** Nur Gewerke **dieses Auftrags** — kein Fallback auf das HW-Profil. */
  if (!projektGewerkSlugs.length) return false;
  if (!projektHatBauleistung(projektGewerkSlugs, alleGewerke)) return false;

  if (typ.nur_bei_bauleistung && !projektHatBauleistung(projektGewerkSlugs, alleGewerke)) {
    return false;
  }
  return typPasstZuGewerken(typ, projektGewerkSlugs);
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
