import type { PartnerVorgangItem } from "@/lib/partner/build-partner-vorgaenge";
import type { PortalDashboardActionSlide } from "@/lib/portal2/dashboard-actions/types";
import { sortDashboardActionSlides } from "@/lib/portal2/dashboard-actions/sort";

function vorgangSortTs(v: PartnerVorgangItem): number {
  const raw =
    v.anfrage?.gesendet_at ||
    v.anfrage?.antwort_at ||
    v.auftrag?.start_datum ||
    v.auftrag?.created_at;
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** Handwerker — offene Vorgänge (Aktion im Detail). */
export function resolvePartnerDashboardActions(
  vorgaenge: PartnerVorgangItem[]
): PortalDashboardActionSlide[] {
  const slides: PortalDashboardActionSlide[] = [];

  for (const v of vorgaenge) {
    if (v.state !== "neu" && v.state !== "geaendert") continue;

    /**
     * „Änderungen bestätigen“ nur bei state=geaendert (Nachreichung nach Annahme).
     * Erstzuweisung / neue Anfrage bleibt „Annehmen“ — auch wenn aenderung_typ=neu
     * oder Reste einer früheren LV-Preisabfrage existieren.
     */
    const typ: "neu" | "nachreichung" =
      v.state === "geaendert" ? "nachreichung" : "neu";
    const kicker =
      typ === "nachreichung" ? "Nachreichung offen" : "Angebot gefordert";
    const primaryLabel =
      typ === "nachreichung" ? "Änderungen bestätigen" : "Annehmen";

    const titel =
      v.auftrag.listen_titel?.trim() ||
      v.anfrage?.listen_titel?.trim() ||
      v.anfrage?.angebot_titel?.trim() ||
      v.auftrag.titel?.trim() ||
      "Vorgang";
    const objekt =
      [v.anfrage?.plz, v.anfrage?.ort].filter(Boolean).join(" ") ||
      [v.auftrag.plz, v.auftrag.ort].filter(Boolean).join(" ") ||
      "—";

    slides.push({
      openId: v.id,
      kicker,
      kickerTone: "sand",
      title: titel,
      subtitle: objekt,
      sortTs: vorgangSortTs(v),
      kind: "partner_offen",
      buttons: [
        {
          id: "ablehnen",
          label: "Ablehnen",
          variant: "secondary",
          /** Öffnet Detail direkt im Ablehnen-Dialog (Grund nötig). */
          mode: "open",
        },
        {
          id: "primary",
          label: primaryLabel,
          variant: "primary",
          mode: "open",
        },
      ],
    });
  }

  return sortDashboardActionSlides(slides);
}
