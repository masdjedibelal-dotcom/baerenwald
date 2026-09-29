import { PortalContentBusy } from "@/components/shared/PortalContentBusy";

export default function PartnerLoading() {
  return (
    <PortalContentBusy
      variant="page"
      body="Einen Moment, Ihre Übersicht wird vorbereitet."
    />
  );
}