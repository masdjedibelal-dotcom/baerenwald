import { PortalContentBusy } from "@/components/shared/PortalContentBusy";

export default function PortalLoading() {
  return (
    <PortalContentBusy
      variant="page"
      body="Einen Moment — wir bereiten Ihre Übersicht vor."
    />
  );
}
