import type { PortalDetailSection } from "@/lib/portal/portal-display";

/** Leistungsort / Verwaltungsobjekt fürs Kundenportal. */
export type PortalObjekt = {
  name: string;
  strasse: string | null;
  plz: string | null;
  ort: string | null;
};

type KundenObjektRow = {
  titel?: string | null;
  strasse?: string | null;
  hausnummer?: string | null;
  plz?: string | null;
  ort?: string | null;
};

type KundeAdresseRow = {
  name?: string | null;
  adresse?: string | null;
  plz?: string | null;
  ort?: string | null;
};

export function portalObjektStrasseZeile(
  o: Pick<KundenObjektRow, "strasse" | "hausnummer">
): string | null {
  const str = o.strasse?.trim() || null;
  const nr = o.hausnummer?.trim() || null;
  if (str && nr) return `${str} ${nr}`;
  return str || nr || null;
}

export function portalObjektFromKundenObjekt(row: KundenObjektRow): PortalObjekt {
  return {
    name: row.titel?.trim() || "Objekt",
    strasse: portalObjektStrasseZeile(row),
    plz: row.plz?.trim() || null,
    ort: row.ort?.trim() || null,
  };
}

export function portalObjektFromKunde(kunde: KundeAdresseRow): PortalObjekt | null {
  const name = kunde.name?.trim();
  const strasse = kunde.adresse?.trim() || null;
  const plz = kunde.plz?.trim() || null;
  const ort = kunde.ort?.trim() || null;
  if (!name && !strasse && !plz && !ort) return null;
  return {
    name: name || "Leistungsort",
    strasse,
    plz,
    ort,
  };
}

export function portalObjektFromLeadPlz(plz?: string | null): PortalObjekt | null {
  const p = plz?.trim();
  if (!p) return null;
  return {
    name: "Leistungsort",
    strasse: null,
    plz: p,
    ort: null,
  };
}

export function resolvePortalObjekt(opts: {
  objektId?: string | null;
  objektById: Map<string, KundenObjektRow>;
  kunde: KundeAdresseRow;
  leadPlz?: string | null;
}): PortalObjekt | null {
  const id = opts.objektId?.trim();
  if (id) {
    const row = opts.objektById.get(id);
    if (row) return portalObjektFromKundenObjekt(row);
  }
  return (
    portalObjektFromKunde(opts.kunde) ??
    portalObjektFromLeadPlz(opts.leadPlz) ??
    null
  );
}

function detailValue(v?: string | null): string | undefined {
  const t = v?.trim();
  return t && t !== "—" ? t : undefined;
}

export function portalObjektDetailRows(
  obj: PortalObjekt
): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value?: string | null }> = [
    { label: "Name", value: obj.name },
    { label: "Straße", value: obj.strasse },
    { label: "PLZ", value: obj.plz },
    { label: "Ort", value: obj.ort },
  ];
  return rows
    .map((r) => ({
      label: r.label,
      value: detailValue(r.value),
    }))
    .filter((r): r is { label: string; value: string } => Boolean(r.value));
}

export function portalObjektSection(obj: PortalObjekt): PortalDetailSection {
  const rows = portalObjektDetailRows(obj);
  return {
    heading: "Objekt / Leistungsort",
    rows: rows.length > 0 ? rows : [{ label: "Name", value: obj.name }],
  };
}

/** Einzeiler für Listen (Info-Spalte / Summary). */
export function portalObjektKurzlabel(obj: PortalObjekt): string {
  const ort = [obj.plz, obj.ort].filter(Boolean).join(" ");
  const parts = [obj.name, obj.strasse, ort].filter(Boolean);
  return parts.join(" · ") || obj.name;
}

export function prependObjektSection(
  sections: PortalDetailSection[],
  obj: PortalObjekt | null | undefined
): PortalDetailSection[] {
  if (!obj) return sections;
  return [portalObjektSection(obj), ...sections];
}
