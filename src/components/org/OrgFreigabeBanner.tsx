"use client";

import { useState } from "react";

import { track } from "@/lib/analytics";

type Props = {
  leadId: string;
  status: string;
  onUpdated: () => void;
};

export function OrgFreigabeBanner({ leadId, status, onUpdated }: Props) {
  const [busy, setBusy] = useState(false);

  if (status !== "ausstehend") return null;

  const act = async (aktion: "freigegeben" | "abgelehnt") => {
    setBusy(true);
    try {
      await fetch("/api/org/freigabe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, aktion }),
      });
      track.orgFreigabe(aktion);
      onUpdated();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-4">
      <p className="text-sm font-medium text-amber-900">Freigabe ausstehend</p>
      <p className="text-xs text-amber-800 mt-1">
        Dieser Vorgang wartet auf Ihre Freigabe, bevor wir weiter planen.
      </p>
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          className="btn-pill-primary !py-1.5 !text-xs"
          disabled={busy}
          onClick={() => act("freigegeben")}
        >
          Freigeben
        </button>
        <button
          type="button"
          className="btn-pill-outline !py-1.5 !text-xs"
          disabled={busy}
          onClick={() => act("abgelehnt")}
        >
          Ablehnen
        </button>
      </div>
    </div>
  );
}
