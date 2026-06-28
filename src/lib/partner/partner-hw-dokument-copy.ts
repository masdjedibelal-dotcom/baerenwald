import {
  PARTNER_MAX_ANGEBOT_DATEIEN,
  PARTNER_MAX_PDF_MB,
} from "@/lib/partner/partner-upload-limits";
import { PARTNER_MAX_HW_UNTERLAGEN_GESAMT } from "@/lib/partner/partner-hw-dokument-typen";

/** Handwerker-PDFs sind nur im CRM sichtbar — nicht im Kundenportal. */
export const PARTNER_HW_DOKUMENT_NUR_CRM =
  "Nur für Bärenwald sichtbar — nicht für den Kunden.";

export const PARTNER_HW_DOKUMENTE_BESCHREIBUNG =
  "Angebote, Rechnungs- oder sonstige Unterlagen an Bärenwald hochladen und versenden.";

/** @deprecated Alias — gleicher Text wie PARTNER_HW_DOKUMENTE_BESCHREIBUNG */
export const PARTNER_AUFTRAG_DOKUMENTE_BESCHREIBUNG = PARTNER_HW_DOKUMENTE_BESCHREIBUNG;

export const PARTNER_HW_DOKUMENT_TYPEN_KURZ =
  "Angebot, Rechnung oder sonstige Unterlage";

export const PARTNER_HW_DOKUMENT_UPLOAD_LABEL = "PDF hochladen";

export function partnerHwDokumentUploadHint(opts?: {
  maxDateien?: number;
  maxGesamt?: number;
}): string {
  const maxBatch = opts?.maxDateien ?? PARTNER_MAX_ANGEBOT_DATEIEN;
  const maxGesamt = opts?.maxGesamt ?? PARTNER_MAX_HW_UNTERLAGEN_GESAMT;
  return `${PARTNER_HW_DOKUMENT_TYPEN_KURZ} — max. ${maxBatch} PDFs pro Upload, insgesamt ${maxGesamt}, je ${PARTNER_MAX_PDF_MB} MB.`;
}
