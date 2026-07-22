export type PortalDokument = {
  id: string;
  name: string;
  subtitle?: string;
  datum?: string;
  href: string;
  art: "rechnung" | "angebot" | "protokoll" | "dokument" | "foto";
};

type AngebotDokumentInput = {
  id: string;
  angebotsnr?: string | null;
  angebotstitel?: string | null;
  pdf_url?: string | null;
  gesendet_am?: string | null;
  status_einfach?: string | null;
  created_at?: string | null;
};

type RechnungDokumentInput = {
  id: string;
  auftrag_id?: string | null;
  rechnungsnummer?: string | null;
  pdf_url?: string | null;
  status?: string | null;
  rechnungsdatum?: string | null;
  gesendet_at?: string | null;
};

type TimelineDokumentInput = {
  id: string;
  auftrag_id?: string | null;
  titel?: string | null;
  beschreibung?: string | null;
  foto_urls?: string[] | null;
  created_at?: string | null;
  fuer_kunde_freigegeben?: boolean | null;
};

type AuftragDokumentInput = {
  id: string;
  abnahme_protokoll_url?: string | null;
  abnahme_datum?: string | null;
  abschlussdokumentation_url?: string | null;
  abschlussdokumentation_gesendet_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

function isKundenAngebotSichtbar(a: AngebotDokumentInput): boolean {
  const st = (a.status_einfach || "").toLowerCase();
  return (
    Boolean(a.gesendet_am) ||
    st === "gesendet" ||
    st === "angenommen" ||
    st === "kunde_akzeptiert"
  );
}

export function dokumenteFromAngebot(a: AngebotDokumentInput): PortalDokument[] {
  const href = a.pdf_url?.trim();
  if (!href || !isKundenAngebotSichtbar(a)) return [];
  const titel = a.angebotstitel?.trim();
  return [
    {
      id: `angebot-pdf-${a.id}`,
      name: "Angebot",
      subtitle: titel || undefined,
      datum: a.gesendet_am ?? a.created_at ?? undefined,
      href,
      art: "angebot",
    },
  ];
}

export function dokumenteFromRechnungen(
  rechnungen: RechnungDokumentInput[]
): PortalDokument[] {
  const rows: PortalDokument[] = [];
  for (const r of rechnungen) {
    if ((r.status || "").toLowerCase() !== "gesendet") continue;
    const href = r.pdf_url?.trim();
    if (!href) continue;
    rows.push({
      id: `rechnung-${r.id}`,
      name: r.rechnungsnummer?.trim()
        ? `Rechnung ${r.rechnungsnummer.trim()}`
        : "Rechnung",
      subtitle: "Rechnung",
      datum: r.gesendet_at ?? r.rechnungsdatum ?? undefined,
      href,
      art: "rechnung",
    });
  }
  return rows;
}

export function dokumenteFromTimeline(
  events: TimelineDokumentInput[]
): PortalDokument[] {
  const rows: PortalDokument[] = [];
  for (const ev of events) {
    if (!ev.fuer_kunde_freigegeben) continue;
    const fotos = Array.isArray(ev.foto_urls) ? ev.foto_urls : [];
    if (fotos.length === 0) continue;
    fotos.forEach((href, index) => {
      if (!href?.trim()) return;
      rows.push({
        id: `timeline-${ev.id}-${index}`,
        name:
          fotos.length > 1
            ? `${ev.titel?.trim() || "Dokument"} (${index + 1})`
            : ev.titel?.trim() || "Dokument",
        subtitle: ev.beschreibung?.trim() || "Projektdokument",
        datum: ev.created_at ?? undefined,
        href: href.trim(),
        art: "dokument",
      });
    });
  }
  return rows;
}

type BautagebuchDokumentInput = {
  id: string;
  datum?: string | null;
  titel?: string | null;
  fotos_urls?: string[];
};

export function dokumenteFromBautagebuch(
  entries: BautagebuchDokumentInput[]
): PortalDokument[] {
  const rows: PortalDokument[] = [];
  for (const entry of entries) {
    const titel = entry.titel?.trim() || "Eintrag";
    const fotos = (entry.fotos_urls ?? []).map((u) => u?.trim()).filter(Boolean);
    if (fotos.length === 0) {
      rows.push({
        id: `bautagebuch-${entry.id}`,
        name: `Bautagebuch — ${titel}`,
        datum: entry.datum ?? undefined,
        href: "",
        art: "dokument",
      });
      continue;
    }
    fotos.forEach((href, index) => {
      rows.push({
        id: `bautagebuch-${entry.id}-${index}`,
        name:
          fotos.length > 1
            ? `Bautagebuch — ${titel} (${index + 1})`
            : `Bautagebuch — ${titel}`,
        datum: entry.datum ?? undefined,
        href,
        art: "foto",
      });
    });
  }
  return rows;
}

export function dokumenteFromAuftrag(
  auftrag: AuftragDokumentInput,
  opts: {
    angebot?: AngebotDokumentInput | null;
    rechnungen?: RechnungDokumentInput[];
    timeline?: TimelineDokumentInput[];
    abnahmeProtokolle?: AbnahmeProtokollDokumentInput[];
  }
): PortalDokument[] {
  const rows: PortalDokument[] = [];

  if (opts.angebot) {
    rows.push(...dokumenteFromAngebot(opts.angebot));
  }

  const abnahmeProtokolle = opts.abnahmeProtokolle ?? [];
  if (abnahmeProtokolle.length > 0) {
    rows.push(...dokumenteFromAbnahmeProtokolle(abnahmeProtokolle));
  } else {
    const abnahme = auftrag.abnahme_protokoll_url?.trim();
    if (abnahme) {
      rows.push({
        id: `abnahme-${auftrag.id}`,
        name: "Abnahmeprotokoll",
        subtitle: "Abnahme",
        datum:
          auftrag.abnahme_datum ??
          auftrag.updated_at ??
          auftrag.created_at ??
          undefined,
        href: abnahme,
        art: "protokoll",
      });
    }
  }

  const abschluss = auftrag.abschlussdokumentation_url?.trim();
  if (abschluss) {
    rows.push({
      id: `abschluss-${auftrag.id}`,
      name: "Abschlussdokumentation",
      subtitle: "Projektabschluss",
      datum:
        auftrag.abschlussdokumentation_gesendet_at ??
        auftrag.updated_at ??
        auftrag.created_at ??
        undefined,
      href: abschluss,
      art: "protokoll",
    });
  }

  rows.push(...dokumenteFromRechnungen(opts.rechnungen ?? []));
  rows.push(...dokumenteFromTimeline(opts.timeline ?? []));

  return rows.sort((a, b) => {
    const ta = new Date(a.datum || 0).getTime();
    const tb = new Date(b.datum || 0).getTime();
    return tb - ta;
  });
}

type AbnahmeProtokollDokumentInput = {
  id: string;
  abnahme_datum?: string | null;
  created_at?: string | null;
  pdf_href?: string | null;
  handwerker_label?: string | null;
};

export function dokumenteFromAbnahmeProtokolle(
  protokolle: AbnahmeProtokollDokumentInput[]
): PortalDokument[] {
  return protokolle
    .filter((p) => p.pdf_href?.trim())
    .map((p) => ({
      id: `abnahme-protokoll-${p.id}`,
      name: p.handwerker_label
        ? `Abnahmeprotokoll — ${p.handwerker_label}`
        : "Abnahmeprotokoll",
      subtitle: "Abnahme",
      datum: p.abnahme_datum ?? p.created_at ?? undefined,
      href: p.pdf_href!.trim(),
      art: "protokoll" as const,
    }));
}

/** Portal-Rollen für Dokumenten-Sichtbarkeit im Vorgang. */
export type PortalDokumenteViewer = "kunde" | "mieter" | "eigentuemer" | "hv";

/** Abnahmeprotokoll / Abnahmedokumentation (Signatur) — nicht Abschlussdokumentation. */
export function isAbnahmePortalDokument(d: PortalDokument): boolean {
  if (d.id.startsWith("abnahme-")) return true;
  if (d.id.startsWith("abschluss-")) return false;
  if (/abschlussdokumentation/i.test(d.name ?? "")) return false;
  if (/abnahme/i.test(d.name ?? "")) return true;
  if (d.subtitle && /abnahme/i.test(d.subtitle) && !/projektabschluss|abschluss/i.test(d.subtitle)) {
    return true;
  }
  return false;
}

/** Bautagebuch-Anhänge (eigene UI-Section, nicht unter Dokumente). */
export function isBautagebuchPortalDokument(d: PortalDokument): boolean {
  if (d.id.startsWith("bautagebuch-")) return true;
  return /^Bautagebuch\b/i.test(d.name ?? "");
}

/**
 * Sichtbarkeit je Rolle:
 * - Kunde/HV: alle CRM-Unterlagen (ohne Bautagebuch — eigene Section)
 * - Mieter: nur Abnahmedokumentation (Signatur)
 * - Eigentümer: alles außer Rechnung
 */
export function filterPortalDokumenteForViewer(
  docs: PortalDokument[],
  opts: {
    viewer?: PortalDokumenteViewer;
    /** @deprecated Nutze `viewer: "mieter"` */
    hvMieterView?: boolean;
    nurErledigt?: boolean;
    erledigt?: boolean;
  }
): PortalDokument[] {
  const viewer: PortalDokumenteViewer =
    opts.viewer ?? (opts.hvMieterView ? "mieter" : "kunde");

  let rows = docs.filter((d) => !isBautagebuchPortalDokument(d));

  if (viewer === "mieter") {
    rows = rows.filter(isAbnahmePortalDokument);
  } else if (viewer === "eigentuemer") {
    rows = rows.filter(
      (d) => d.art !== "rechnung" && !/^Rechnung\b/i.test(d.name ?? "")
    );
  }

  if (opts.nurErledigt && !opts.erledigt) {
    rows = rows.filter((d) => d.art === "foto" || d.art === "dokument");
  }
  return rows;
}

export function dokumenteFromUrls(
  urls: string[],
  art: PortalDokument["art"] = "dokument"
): PortalDokument[] {
  return urls.map((href, index) => {
    const file = href.split("/").pop()?.split("?")[0];
    return {
      id: `url-${index}-${href}`,
      name: file && file.length < 80 ? file : `Anhang ${index + 1}`,
      href,
      art,
    };
  });
}

export function mergeDokumente(
  ...groups: PortalDokument[][]
): PortalDokument[] {
  const byId = new Map<string, PortalDokument>();
  for (const group of groups) {
    for (const doc of group) {
      byId.set(doc.id, doc);
    }
  }
  return Array.from(byId.values());
}
