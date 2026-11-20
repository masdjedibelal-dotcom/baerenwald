import { PortalContentBusy } from "@/components/shared/PortalContentBusy";

/** Servus TEO: Ladeanzeige beim Seitenwechsel (vorher blieb der Bildschirm kurz leer). */
export default function ArbeitsplatzLoading() {
  return <PortalContentBusy variant="page" body="Einen Moment, die Seite wird geladen." />;
}
