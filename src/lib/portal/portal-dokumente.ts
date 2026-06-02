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
  return [
    {
      id: `angebot-pdf-${a.id}`,
      name: a.angebotsnr?.trim()
        ? `Angebot ${a.angebotsnr.trim()}`
        : "Angebot (PDF)",
      subtitle: "Angebot",
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

export function dokumenteFromAuftrag(
  auftrag: AuftragDokumentInput,
  opts: {
    angebot?: AngebotDokumentInput | null;
    rechnungen?: RechnungDokumentInput[];
    timeline?: TimelineDokumentInput[];
    bautagebuchFotoUrls?: string[];
  }
): PortalDokument[] {
  const rows: PortalDokument[] = [];

  if (opts.angebot) {
    rows.push(...dokumenteFromAngebot(opts.angebot));
  }

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

  rows.push(...dokumenteFromRechnungen(opts.rechnungen ?? []));
  rows.push(...dokumenteFromTimeline(opts.timeline ?? []));

  (opts.bautagebuchFotoUrls ?? []).forEach((href, index) => {
    if (!href?.trim()) return;
    rows.push({
      id: `bautagebuch-foto-${auftrag.id}-${index}`,
      name:
        (opts.bautagebuchFotoUrls?.length ?? 0) > 1
          ? `Baustellenfoto (${index + 1})`
          : "Baustellenfoto",
      subtitle: "Bautagebuch",
      href: href.trim(),
      art: "foto",
    });
  });

  return rows.sort((a, b) => {
    const ta = new Date(a.datum || 0).getTime();
    const tb = new Date(b.datum || 0).getTime();
    return tb - ta;
  });
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
