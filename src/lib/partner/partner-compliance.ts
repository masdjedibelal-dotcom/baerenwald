import { resolvePartnerFileUrl } from "@/lib/partner/partner-storage";

export type PartnerDokumentStatus =
  | "hochgeladen"
  | "in_pruefung"
  | "freigegeben"
  | "abgelehnt";

export type PartnerComplianceTypRow = {
  slug: string;
  bezeichnung: string;
  beschreibung: string | null;
  pflicht_bauprojekt: boolean;
  mehrfach_erlaubt: boolean;
  kategorie: string | null;
  sort_order: number;
  scope: string;
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
  | "offen";

export type PartnerComplianceItem = {
  slug: string;
  bezeichnung: string;
  beschreibung?: string | null;
  pflicht: boolean;
  kategorie?: string | null;
  scope: string;
  status: PartnerComplianceItemStatus;
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

function normalizeDocStatus(raw: string): PartnerComplianceItemStatus {
  const s = raw.toLowerCase();
  if (FREIGEGEBEN.has(s)) return "erledigt";
  if (ABGELEHNT.has(s)) return "abgelehnt";
  if (IN_PRUEFUNG.has(s)) return "in_pruefung";
  return "offen";
}

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
    const docs = opts.dokumente.filter((d) => {
      if (d.typ !== typ.slug) return false;
      if (typ.scope === "stamm") return !d.auftrag_id;
      if (opts.auftragId) return d.auftrag_id === opts.auftragId;
      return Boolean(d.auftrag_id);
    });

    const latest = [...docs].sort(
      (a, b) =>
        new Date(b.hochgeladen_am).getTime() - new Date(a.hochgeladen_am).getTime()
    )[0];

    let status: PartnerComplianceItemStatus = "offen";
    if (latest) {
      status = normalizeDocStatus(latest.status);
    }

    return {
      slug: typ.slug,
      bezeichnung: typ.bezeichnung,
      beschreibung: typ.beschreibung,
      pflicht: typ.pflicht_bauprojekt,
      kategorie: typ.kategorie,
      scope: typ.scope,
      status,
      dokument: latest
        ? {
            id: latest.id,
            gueltig_bis: latest.gueltig_bis,
            hochgeladen_am: latest.hochgeladen_am,
            ablehnung_grund: latest.ablehnung_grund,
          }
        : undefined,
    };
  });
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
  return items.some((i) => i.pflicht && i.status !== "erledigt");
}

export function complianceStatusLabel(status: PartnerComplianceItemStatus): string {
  if (status === "erledigt") return "Erledigt";
  if (status === "in_pruefung") return "In Prüfung";
  if (status === "abgelehnt") return "Abgelehnt";
  return "Offen";
}
