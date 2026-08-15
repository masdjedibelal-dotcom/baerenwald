import type { DokumentZeile } from "@/components/shared/DokumenteTabelle";
import type { PartnerAuftragItem } from "@/lib/partner/get-partner-data";
import { partnerHwDokumentListenName, PARTNER_MAX_HW_UNTERLAGEN_GESAMT } from "@/lib/partner/partner-hw-dokument-typen";

function dokumentDatumMs(datum?: string | null): number {
  if (!datum?.trim()) return 0;
  const ms = new Date(datum).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

/** Neueste zuerst; Einträge ohne Datum unten (wie Kundenportal). */
export function sortPartnerDokumentZeilen(rows: DokumentZeile[]): DokumentZeile[] {
  return [...rows].sort((a, b) => {
    const ta = dokumentDatumMs(a.datum);
    const tb = dokumentDatumMs(b.datum);
    if (ta !== tb) {
      if (ta === 0) return 1;
      if (tb === 0) return -1;
      return tb - ta;
    }
    return a.name.localeCompare(b.name, "de");
  });
}

export function fachdokuSlotsToDokumentZeilen(
  slots: Array<{
    id: string;
    label: string;
    status: string;
    erledigt_am?: string | null;
    signed_url?: string | null;
    datei_url?: string | null;
  }>
): DokumentZeile[] {
  const rows: DokumentZeile[] = [];
  for (const s of slots) {
    if (String(s.status).toLowerCase() !== "erledigt") continue;
    const href = s.signed_url?.trim() || s.datei_url?.trim();
    if (!href) continue;
    rows.push({
      id: `fachdoku-${s.id}`,
      datum: s.erledigt_am ?? undefined,
      name: s.label,
      href,
      meta: "Fachnachweis",
    });
  }
  return rows;
}

/** Dokumente im Auftrag: Projektvertrag, HW-Unterlagen/Rechnung, Auftrags-Compliance — keine Stammdaten. */
export function buildPartnerAuftragDokumentZeilen(
  item: PartnerAuftragItem
): DokumentZeile[] {
  const rows: DokumentZeile[] = [];
  const vertrag = item.vertrag?.projektvertrag;
  const vertragHref = vertrag?.pdf_signed_url?.trim() || vertrag?.pdf_url?.trim();
  if (vertragHref) {
    rows.push({
      id: `vertrag-${vertrag?.id ?? item.id}`,
      datum: vertrag?.signiert_am,
      name: vertrag?.vertrags_nr
        ? `Projektvertrag ${vertrag.vertrags_nr}`
        : "Projektvertrag",
      href: vertragHref,
    });
  }

  const anhangSigned =
    item.hw_angebot_anhang_signed_urls?.length
      ? item.hw_angebot_anhang_signed_urls
      : item.hw_angebot_pdf_signed_url
        ? [item.hw_angebot_pdf_signed_url]
        : [];
  const kannHwDocsLoeschen =
    String(item.status ?? "").toLowerCase() !== "storniert" &&
    String(item.angebotHwStatus ?? "").toLowerCase() !== "abgelehnt";

  anhangSigned.forEach((href, i) => {
    rows.push({
      id: `hw-unterlage-${i}`,
      datum: item.angebotHwEingereichtAt,
      name: partnerHwDokumentListenName("unterlage", {
        index: i,
        total: anhangSigned.length,
      }),
      href,
      canDelete: kannHwDocsLoeschen,
    });
  });

  if (item.hw_rechnung_pdf_signed_url) {
    rows.push({
      id: "hw-rechnung",
      datum: item.hw_rechnung_eingereicht_at,
      name: partnerHwDokumentListenName("rechnung"),
      href: item.hw_rechnung_pdf_signed_url,
      canDelete: kannHwDocsLoeschen,
    });
  }

  for (const d of item.vertrag?.dokumente_zeilen ?? []) {
    if (d.id.startsWith("vertrag-")) continue;
    if (rows.some((r) => r.id === d.id)) continue;
    rows.push(d);
  }

  rows.push(...fachdokuSlotsToDokumentZeilen(item.fachdokuSlots ?? []));

  return sortPartnerDokumentZeilen(rows);
}

export function partnerAuftragHatAbschluss(
  item: Pick<
    PartnerAuftragItem,
    "hw_abschluss_signiert_am" | "abnahme_freigabe_status"
  >
): boolean {
  if (item.hw_abschluss_signiert_am?.trim()) return true;
  const freigabe = String(item.abnahme_freigabe_status ?? "")
    .trim()
    .toLowerCase();
  // Eigener Abschluss eingereicht (warte auf Freigabe oder freigegeben)
  return Boolean(freigabe) && freigabe !== "abgelehnt";
}

/**
 * Auto-Rechnung / Upload erst nach eigenem Abschluss.
 * Optional: `abschlussDoneLocal` direkt nach Signatur im Sheet.
 */
export function partnerAuftragKannRechnungHochladen(
  item: PartnerAuftragItem,
  opts?: { abschlussDoneLocal?: boolean }
): boolean {
  if (!item.angebotHandwerkerId) return false;
  if (item.status.toLowerCase() === "storniert") return false;
  if (item.hw_rechnung_eingereicht_at) return false;
  const hwSt = (item.angebotHwStatus ?? "").toLowerCase();
  if (hwSt !== "uebernommen") return false;
  if (!opts?.abschlussDoneLocal && !partnerAuftragHatAbschluss(item)) {
    return false;
  }
  return true;
}

/** @deprecated Sticky-CTA nutzt `partnerAuftragKannRechnungHochladen`. */
export function partnerNeedsAutoRechnungPrompt(item: PartnerAuftragItem): boolean {
  return partnerAuftragKannRechnungHochladen(item);
}

export function partnerAuftragKannUnterlagenHochladen(item: PartnerAuftragItem): boolean {
  if (!item.angebotHandwerkerId) return false;
  if (item.status.toLowerCase() === "storniert") return false;
  const hwSt = (item.angebotHwStatus ?? "").toLowerCase();
  if (hwSt !== "uebernommen") return false;
  const anzahl =
    item.hw_angebot_anhang_urls?.length ?? (item.hw_angebot_pdf_url ? 1 : 0);
  return anzahl < PARTNER_MAX_HW_UNTERLAGEN_GESAMT;
}

export function partnerAuftragZeigtDokumenteUpload(
  item: PartnerAuftragItem,
  opts?: { abschlussDoneLocal?: boolean }
): boolean {
  return (
    partnerAuftragKannUnterlagenHochladen(item) ||
    partnerAuftragKannRechnungHochladen(item, opts)
  );
}
