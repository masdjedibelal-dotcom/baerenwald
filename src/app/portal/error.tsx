"use client";

import { PortalServerErrorState } from "@/components/shared/PortalStateView";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

/** Portal-Route Error Boundary — Mock `server`-State. */
export default function PortalError({ reset }: Props) {
  return (
    <div className="portal-ui min-h-screen bg-surface-page">
      <PortalServerErrorState onPrimary={reset} />
    </div>
  );
}
