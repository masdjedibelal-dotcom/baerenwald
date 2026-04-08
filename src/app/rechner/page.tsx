import { Suspense } from "react";

import { FunnelClient } from "./FunnelClient";

export default function RechnerPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-white" aria-label="Laden" />}
    >
      <FunnelClient />
    </Suspense>
  );
}
