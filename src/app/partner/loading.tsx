import { PortalContentBusy } from "@/components/shared/PortalContentBusy";

export default function PartnerLoading() {
  return (
    <PortalContentBusy
      variant="page"
      title="Partner-Portal wird geladen…"
      body="Einen Moment — wir bereiten deine Übersicht vor."
    />
  );
}