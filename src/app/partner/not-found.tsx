import { PortalNotFoundState } from "@/components/shared/PortalStateView";

/** Partner 404 — Mock `e404`-State. */
export default function PartnerNotFound() {
  return (
    <div className="portal-ui min-h-screen bg-surface-page">
      <PortalNotFoundState primaryHref="/partner" />
    </div>
  );
}
