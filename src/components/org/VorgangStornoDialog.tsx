"use client";

import { useState } from "react";

import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { portalToastError, portalToastSuccess } from "@/lib/shared/portal-toast";

export function VorgangStornoDialog({
  leadId,
  inAusfuehrung,
  onDone,
}: {
  leadId: string;
  inAusfuehrung: boolean;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [grund, setGrund] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/org/vorgang-storno", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, grund }),
      });
      const json = (await res.json()) as { error?: string; hinweis?: string };
      if (!res.ok) {
        portalToastError(json.error ?? "Storno fehlgeschlagen");
        return;
      }
      portalToastSuccess("Vorgang zurückgezogen", json.hinweis ?? "");
      setOpen(false);
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn-pill-outline !text-xs"
        onClick={() => setOpen(true)}
      >
        Vorgang zurückziehen
      </button>

      <PortalModalShell
        open={open}
        title="Vorgang zurückziehen?"
        onClose={() => {
          if (busy) return;
          setOpen(false);
        }}
        variant="edit"
        dirty={grund.trim().length > 0}
        closeOnBackdrop={!busy}
        busy={busy}
      >
        <form id="vorgang-storno-form" onSubmit={submit} className="space-y-4">
          <p className="portal-text-body text-text-secondary">
            {inAusfuehrung
              ? "Die Ausführung hat bereits begonnen. Bärenwald prüft mögliche Abbruchkosten."
              : "Vor Ausführungsbeginn ist der Rückzug in der Regel kostenfrei."}
          </p>
          <textarea
            className="portal-input min-h-[88px] w-full rounded-xl border border-border-default px-3 py-2.5 text-sm"
            placeholder="Grund (Pflichtfeld)"
            value={grund}
            onChange={(e) => setGrund(e.target.value)}
            required
            minLength={5}
            disabled={busy}
          />
          <div className="portal-action-row">
            <button
              type="button"
              className="portal-action-btn portal-action-btn--secondary"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="portal-action-btn portal-action-btn--danger"
              disabled={busy}
            >
              {busy ? "Wird gespeichert…" : "Zurückziehen"}
            </button>
          </div>
        </form>
      </PortalModalShell>
    </>
  );
}
