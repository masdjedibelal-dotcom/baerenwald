import {
  previewPartnerAutoDokument,
  submitPartnerAutoAngebot,
} from "@/app/actions/partner-auto-dokumente";

export type TryPartnerAutoAngebotResult =
  | { status: "created"; dokumentNr: string }
  | { status: "already"; dokumentNr: string }
  | { status: "firmendaten_missing"; missing: string[] }
  | { status: "skipped"; error: string };

/** Nach Annahme: Angebot still erzeugen oder Firmendaten-Lücke melden. */
export async function tryCreatePartnerAutoAngebot(
  anfrageId: string
): Promise<TryPartnerAutoAngebotResult> {
  const id = anfrageId.trim();
  if (!id) return { status: "skipped", error: "Keine Anfrage." };

  const preview = await previewPartnerAutoDokument({
    anfrageId: id,
    art: "angebot",
  });
  if (!preview.ok) {
    return { status: "skipped", error: preview.error };
  }

  if (preview.preview.missingFirmendaten.length > 0) {
    return {
      status: "firmendaten_missing",
      missing: preview.preview.missingFirmendaten,
    };
  }

  if (!preview.preview.canSubmit) {
    const labels = preview.preview.missingFields.map((m) => m.label).join(", ");
    return {
      status: "skipped",
      error: labels
        ? `Angebot nicht automatisch möglich: ${labels}.`
        : "Angebot nicht automatisch möglich.",
    };
  }

  const res = await submitPartnerAutoAngebot(id, {
    dokumentNr: preview.preview.dokumentNr,
  });
  if (!res.ok) {
    if (/Firmendaten/i.test(res.error)) {
      return {
        status: "firmendaten_missing",
        missing: preview.preview.missingFirmendaten,
      };
    }
    return { status: "skipped", error: res.error };
  }

  if (res.already) {
    return { status: "already", dokumentNr: res.dokumentNr };
  }

  return { status: "created", dokumentNr: res.dokumentNr };
}
