import { PortalContentBusy } from "@/components/shared/PortalContentBusy";

export default function PartnerLoading() {
  return (
    <PortalContentBusy
      variant="page"
      body="Einen Moment — wir bereiten deine Übersicht vor."
    />
  );
}