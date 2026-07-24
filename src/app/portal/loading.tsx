import { PortalAuthBusy } from "@/components/portal/auth/PortalAuthBusy";

export default function PortalLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4 py-16">
      <PortalAuthBusy
        title="Portal wird geladen…"
        body="Einen Moment — wir bereiten deine Übersicht vor."
      />
    </div>
  );
}
