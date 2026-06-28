import type { DokumentZeile } from "@/components/shared/DokumenteTabelle";
import type { PartnerAuftragItem } from "@/lib/partner/get-partner-data";
import { partnerHwDokumentListenName, PARTNER_MAX_HW_UNTERLAGEN_GESAMT } from "@/lib/partner/partner-hw-dokument-typen";

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
  anhangSigned.forEach((href, i) => {
    rows.push({
      id: `hw-unterlage-${i}`,
      datum: item.angebotHwEingereichtAt,
      name: partnerHwDokumentListenName("unterlage", {
        index: i,
        total: anhangSigned.length,
      }),
      href,
    });
  });

  if (item.hw_rechnung_pdf_signed_url) {
    rows.push({
      id: "hw-rechnung",
      datum: item.hw_rechnung_eingereicht_at,
      name: partnerHwDokumentListenName("rechnung"),
      href: item.hw_rechnung_pdf_signed_url,
    });
  }

  for (const d of item.vertrag?.dokumente_zeilen ?? []) {
    if (d.id.startsWith("vertrag-")) continue;
    if (rows.some((r) => r.id === d.id)) continue;
    rows.push(d);
  }

  return rows;
}

export function partnerAuftragKannRechnungHochladen(item: PartnerAuftragItem): boolean {
  if (!item.angebotHandwerkerId) return false;
  if (item.status.toLowerCase() === "storniert") return false;
  const hwSt = (item.angebotHwStatus ?? "").toLowerCase();
  return (
    hwSt === "uebernommen" &&
    Boolean(item.projektvertrag_bestaetigt_am) &&
    !item.hw_rechnung_eingereicht_at
  );
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
  item: PartnerAuftragItem
): boolean {
  return (
    partnerAuftragKannUnterlagenHochladen(item) ||
    partnerAuftragKannRechnungHochladen(item)
  );
}
