import { PortalNotFoundState } from "@/components/shared/PortalStateView";

/** Portal 404 — Mock `e404`-State. */
export default function PortalNotFound() {
  return (
    <div className="portal-ui min-h-screen bg-surface-page">
      <PortalNotFoundState />
    </div>
  );
}
