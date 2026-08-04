import { PortalContentBusy } from "@/components/shared/PortalContentBusy";

export default function PortalLoading() {
  return (
    <PortalContentBusy
      variant="page"
      title="Portal wird geladen…"
      body="Einen Moment — wir bereiten deine Übersicht vor."
    />
  );
}
