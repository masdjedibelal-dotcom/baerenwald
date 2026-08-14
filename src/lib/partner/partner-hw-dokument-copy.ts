import {
  PARTNER_MAX_ANGEBOT_DATEIEN,
  PARTNER_MAX_PDF_MB,
} from "@/lib/partner/partner-upload-limits";
import { PARTNER_MAX_HW_UNTERLAGEN_GESAMT } from "@/lib/partner/partner-hw-dokument-typen";

/** Unterlagen an Bärenwald senden. */
export const PARTNER_HW_DOKUMENTE_BESCHREIBUNG =
  "Fotos und Dokumente zum Auftrag hochladen.";

/** @deprecated Nicht mehr in der UI anzeigen */
export const PARTNER_HW_DOKUMENT_NUR_CRM = "";

export const PARTNER_HW_DOKUMENT_UPLOAD_LABEL = "Fotos & Dokumente";

/** @deprecated Alias — gleicher Text wie PARTNER_HW_DOKUMENTE_BESCHREIBUNG */
export const PARTNER_AUFTRAG_DOKUMENTE_BESCHREIBUNG = PARTNER_HW_DOKUMENTE_BESCHREIBUNG;

export const PARTNER_HW_DOKUMENT_TYPEN_KURZ =
  "Fotos (JPG/PNG/WebP) oder PDF";

export function partnerHwDokumentUploadHint(opts?: {
  maxDateien?: number;
  maxGesamt?: number;
}): string {
  const maxBatch = opts?.maxDateien ?? PARTNER_MAX_ANGEBOT_DATEIEN;
  const maxGesamt = opts?.maxGesamt ?? PARTNER_MAX_HW_UNTERLAGEN_GESAMT;
  return `${PARTNER_HW_DOKUMENT_TYPEN_KURZ} — max. ${maxBatch} PDFs pro Upload, insgesamt ${maxGesamt}, je ${PARTNER_MAX_PDF_MB} MB.`;
}
