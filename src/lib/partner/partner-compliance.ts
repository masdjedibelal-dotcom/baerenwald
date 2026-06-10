import { resolvePartnerFileUrl } from "@/lib/partner/partner-storage";
import {
  complianceAblaufHinweis,
  filterLeistungComplianceTypen,
  filterPartnerComplianceTypen,
  istPflichtFuerPartner,
  istPflichtFuerProjekt,
  normalizeComplianceEbene,
  type ComplianceEbene,
  type PartnerComplianceTypEbene,
  type PartnerGewerkRow,
} from "@/lib/partner/compliance-partner-profile";

export type PartnerDokumentStatus =
  | "hochgeladen"
  | "in_pruefung"
  | "freigegeben"
  | "abgelehnt";

export type PartnerComplianceTypRow = PartnerComplianceTypEbene & {
  bezeichnung: string;
  beschreibung: string | null;
  pflicht_bauprojekt: boolean;
  mehrfach_erlaubt: boolean;
  kategorie: string | null;
  sort_order: number;
  scope: string;
  erneuerung_monate?: number | null;
};

export type PartnerDokumentRow = {
  id: string;
  typ: string;
  bezeichnung: string | null;
  gueltig_bis: string | null;
  datei_url: string;
  status: string;
  ablehnung_grund: string | null;
  hochgeladen_am: string;
  auftrag_id: string | null;
};

export type PartnerComplianceItemStatus =
  | "erledigt"
  | "in_pruefung"
  | "abgelehnt"
  | "offen"
  | "ablauf_warnung"
  | "abgelaufen";

export type PartnerComplianceItem = {
  slug: string;
  bezeichnung: string;
  beschreibung?: string | null;
  pflicht: boolean;
  kategorie?: string | null;
  ebene: ComplianceEbene;
  scope: string;
  status: PartnerComplianceItemStatus;
  ablauf_hinweis?: string | null;
  erneuerung_monate?: number | null;
  dokument?: {
    id: string;
    gueltig_bis?: string | null;
    hochgeladen_am?: string;
    signed_url?: string | null;
    ablehnung_grund?: string | null;
  };
};

export type PartnerProjektvertrag = {
  id: string;
  vertrags_nr: string | null;
  status: string;
  pdf_url: string | null;
  pdf_signed_url: string | null;
  auftrag_titel: string | null;
  gewerk_name: string | null;
  bauvorhaben: string | null;
  leistungsumfang: string | null;
  verguetung_text: string | null;
  signiert_am: string | null;
};

const FREIGEGEBEN = new Set(["freigegeben", "genehmigt", "ok"]);
const IN_PRUEFUNG = new Set(["hochgeladen", "in_pruefung", "eingereicht"]);
const ABGELEHNT = new Set(["abgelehnt", "rejected"]);

function gueltigBisStatus(
  gueltigBis: string | null | undefined
): "ok" | "warnung" | "abgelaufen" | "fehlend" {
  if (!gueltigBis?.trim()) return "ok";
  const bis = new Date(gueltigBis);
  if (Number.isNaN(bis.getTime())) return "ok";
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  bis.setHours(0, 0, 0, 0);
  if (bis < heute) return "abgelaufen";
  const warn = new Date(heute);
  warn.setDate(warn.getDate() + 30);
  if (bis <= warn) return "warnung";
  return "ok";
}

function normalizeDocStatus(
  raw: string,
  gueltigBis: string | null | undefined
): PartnerComplianceItemStatus {
  const s = raw.toLowerCase();
  if (ABGELEHNT.has(s)) return "abgelehnt";
  if (IN_PRUEFUNG.has(s)) return "in_pruefung";

  const ablauf = gueltigBisStatus(gueltigBis);
  if (FREIGEGEBEN.has(s)) {
    if (ablauf === "abgelaufen") return "abgelaufen";
    if (ablauf === "warnung") return "ablauf_warnung";
    return "erledigt";
  }
  return "offen";
}

function itemFromTyp(
  typ: PartnerComplianceTypRow,
  dokumente: PartnerDokumentRow[],
  opts: {
    pflicht: boolean;
    auftragId?: string | null;
    ebene: ComplianceEbene;
  }
): PartnerComplianceItem {
  const docs = dokumente.filter((d) => {
    if (d.typ !== typ.slug) return false;
    if (opts.ebene === "leistung") {
      if (opts.auftragId) return d.auftrag_id === opts.auftragId;
      return Boolean(d.auftrag_id);
    }
    return !d.auftrag_id;
  });

  const latest = [...docs].sort(
    (a, b) => new Date(b.hochgeladen_am).getTime() - new Date(a.hochgeladen_am).getTime()
  )[0];

  let status: PartnerComplianceItemStatus = "offen";
  if (latest) {
    status = normalizeDocStatus(latest.status, latest.gueltig_bis);
  }

  const ablaufRaw =
    status === "offen"
      ? "fehlend"
      : status === "abgelaufen"
        ? "abgelaufen"
        : status === "ablauf_warnung"
          ? "warnung"
          : "ok";

  return {
    slug: typ.slug,
    bezeichnung: typ.bezeichnung,
    beschreibung: typ.beschreibung,
    pflicht: opts.pflicht,
    kategorie: typ.kategorie,
    ebene: opts.ebene,
    scope: typ.scope,
    status,
    ablauf_hinweis: complianceAblaufHinweis(ablaufRaw, latest?.gueltig_bis),
    erneuerung_monate: typ.erneuerung_monate ?? null,
    dokument: latest
      ? {
          id: latest.id,
          gueltig_bis: latest.gueltig_bis,
          hochgeladen_am: latest.hochgeladen_am,
          ablehnung_grund: latest.ablehnung_grund,
        }
      : undefined,
  };
}

/** @deprecated Nutze buildPartnerStammCompliance / buildProjektCompliance */
export function buildComplianceChecklist(opts: {
  typen: PartnerComplianceTypRow[];
  dokumente: PartnerDokumentRow[];
  scopeFilter?: Array<"stamm" | "bauprojekt" | "gewerk">;
  auftragId?: string | null;
}): PartnerComplianceItem[] {
  const scopes = opts.scopeFilter ?? ["stamm", "bauprojekt", "gewerk"];
  const typen = opts.typen
    .filter((t) => scopes.includes(t.scope as "stamm" | "bauprojekt" | "gewerk"))
    .sort((a, b) => a.sort_order - b.sort_order);

  return typen.map((typ) => {
    const ebene = normalizeComplianceEbene(typ);
    return itemFromTyp(typ, opts.dokumente, {
      pflicht: ebene === "leistung" ? typ.pflicht_bauprojekt : typ.pflicht_fuer_fachbetriebe === true,
      auftragId: opts.auftragId,
      ebene,
    });
  });
}

export function buildPartnerStammCompliance(opts: {
  typen: PartnerComplianceTypRow[];
  dokumente: PartnerDokumentRow[];
  handwerkerGewerke: string[] | null | undefined;
  alleGewerke: PartnerGewerkRow[];
}): { allgemein: PartnerComplianceItem[]; meister: PartnerComplianceItem[] } {
  const allgemein = filterPartnerComplianceTypen(
    opts.typen,
    "allgemein",
    opts.handwerkerGewerke,
    opts.alleGewerke
  ).map((typ) =>
    itemFromTyp(typ, opts.dokumente, {
      pflicht: istPflichtFuerPartner(typ, opts.handwerkerGewerke, opts.alleGewerke),
      ebene: "allgemein",
    })
  );

  const meister = filterPartnerComplianceTypen(
    opts.typen,
    "meister",
    opts.handwerkerGewerke,
    opts.alleGewerke
  ).map((typ) =>
    itemFromTyp(typ, opts.dokumente, {
      pflicht: istPflichtFuerPartner(typ, opts.handwerkerGewerke, opts.alleGewerke),
      ebene: "meister",
    })
  );

  return { allgemein, meister };
}

export function buildProjektCompliance(opts: {
  typen: PartnerComplianceTypRow[];
  dokumente: PartnerDokumentRow[];
  auftragId: string;
  projektGewerkSlugs: string[];
  handwerkerGewerke: string[] | null | undefined;
  alleGewerke: PartnerGewerkRow[];
}): PartnerComplianceItem[] {
  return filterLeistungComplianceTypen(
    opts.typen,
    opts.projektGewerkSlugs,
    opts.handwerkerGewerke,
    opts.alleGewerke
  ).map((typ) =>
    itemFromTyp(typ, opts.dokumente, {
      pflicht: istPflichtFuerProjekt(
        typ,
        opts.projektGewerkSlugs,
        opts.handwerkerGewerke,
        opts.alleGewerke
      ),
      auftragId: opts.auftragId,
      ebene: "leistung",
    })
  );
}

export async function enrichComplianceWithSignedUrls(
  items: PartnerComplianceItem[],
  dokumente: PartnerDokumentRow[]
): Promise<PartnerComplianceItem[]> {
  const byId = new Map(dokumente.map((d) => [d.id, d]));
  return Promise.all(
    items.map(async (item) => {
      if (!item.dokument) return item;
      const row = byId.get(item.dokument.id);
      if (!row) return item;
      const signed_url = await resolvePartnerFileUrl(row.datei_url);
      return {
        ...item,
        dokument: { ...item.dokument, signed_url },
      };
    })
  );
}

export async function mapProjektvertragRow(
  row: Record<string, unknown> | null
): Promise<PartnerProjektvertrag | null> {
  if (!row) return null;
  const pdf_url = (row.pdf_url as string | null) ?? null;
  const pdf_signed_url = pdf_url ? await resolvePartnerFileUrl(pdf_url) : null;
  return {
    id: String(row.id),
    vertrags_nr: (row.vertrags_nr as string | null) ?? null,
    status: String(row.status ?? "entwurf"),
    pdf_url,
    pdf_signed_url,
    auftrag_titel: (row.auftrag_titel as string | null) ?? null,
    gewerk_name: (row.gewerk_name as string | null) ?? null,
    bauvorhaben: (row.bauvorhaben as string | null) ?? null,
    leistungsumfang: (row.leistungsumfang as string | null) ?? null,
    verguetung_text: (row.verguetung_text as string | null) ?? null,
    signiert_am: (row.signiert_am as string | null) ?? null,
  };
}

export function hasGueltigerProjektvertrag(
  vertrag: PartnerProjektvertrag | null | undefined
): boolean {
  if (!vertrag) return false;
  const st = vertrag.status.toLowerCase();
  return (
    st === "pdf_erzeugt" ||
    st === "unterschrieben" ||
    st === "signiert" ||
    Boolean(vertrag.pdf_url || vertrag.pdf_signed_url)
  );
}

export function compliancePflichtOffen(items: PartnerComplianceItem[]): boolean {
  return items.some(
    (i) =>
      i.pflicht &&
      i.status !== "erledigt" &&
      i.status !== "in_pruefung" &&
      i.status !== "ablauf_warnung"
  );
}

export function complianceStatusLabel(status: PartnerComplianceItemStatus): string {
  if (status === "erledigt") return "Vorhanden";
  if (status === "in_pruefung") return "In Prüfung";
  if (status === "abgelehnt") return "Abgelehnt";
  if (status === "ablauf_warnung") return "Läuft bald ab";
  if (status === "abgelaufen") return "Abgelaufen";
  return "Fehlt";
}
