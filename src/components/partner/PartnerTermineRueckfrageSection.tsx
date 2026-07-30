"use client";

import { useState } from "react";

import {
  createPartnerRueckfrage,
  createPartnerTerminSlots,
} from "@/app/actions/partner-rueckfrage-termine";
import {
  PartnerDetailError,
  PartnerDetailSection,
} from "@/components/partner/PartnerDetailUi";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { portalToastSuccess } from "@/lib/shared/portal-toast";

/** Partner: Rückfrage + Terminvorschläge — CTAs öffnen Shell `edit`. */
export function PartnerTermineRueckfrageSection({
  auftragId,
}: {
  auftragId: string;
}) {
  const [mode, setMode] = useState<"frage" | "termin" | null>(null);
  const [rueckfrage, setRueckfrage] = useState("");
  const [slotBeginn, setSlotBeginn] = useState("");
  const [slotEnde, setSlotEnde] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function closeSheet() {
    if (busy) return;
    setMode(null);
    setError(null);
  }

  async function sendFrage(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await createPartnerRueckfrage(auftragId, rueckfrage);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    portalToastSuccess("Gesendet", "Rückfrage übermittelt.");
    setRueckfrage("");
    setMode(null);
  }

  async function sendTermin(e: React.FormEvent) {
    e.preventDefault();
    if (!slotBeginn) return;
    setBusy(true);
    setError(null);
    const res = await createPartnerTerminSlots(auftragId, [
      { beginn: slotBeginn, ende: slotEnde || undefined },
    ]);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    portalToastSuccess("Gesendet", "Mieter kann den Termin bestätigen.");
    setSlotBeginn("");
    setSlotEnde("");
    setMode(null);
  }

  return (
    <>
      <PartnerDetailSection title="Termin & Rückfrage">
        <p className="mb-3 text-[13px] leading-relaxed text-text-secondary">
          Termin vorschlagen oder Rückfrage an Bärenwald stellen.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-pill-primary portal-btn !px-4 !py-2.5"
            onClick={() => setMode("termin")}
          >
            Termin
          </button>
          <button
            type="button"
            className="btn-pill-outline portal-btn !px-4 !py-2.5"
            onClick={() => setMode("frage")}
          >
            Rückfrage
          </button>
        </div>
      </PartnerDetailSection>

      <PortalModalShell
        open={mode === "frage"}
        title="Rückfrage"
        subtitle="An Bärenwald — min. 10 Zeichen"
        onClose={closeSheet}
        variant="edit"
        dirty={rueckfrage.trim().length > 0}
        closeOnBackdrop={!busy}
      >
        <form onSubmit={sendFrage} className="space-y-3">
          <textarea
            className="portal-input w-full min-h-[100px] rounded-xl border border-border-default px-3 py-2.5"
            placeholder="Frage zum Auftrag…"
            value={rueckfrage}
            onChange={(e) => setRueckfrage(e.target.value)}
            required
            minLength={10}
            disabled={busy}
          />
          {error ? <PartnerDetailError message={error} /> : null}
          <button
            type="submit"
            className="btn-pill-primary portal-btn w-full !px-4 !py-2.5"
            disabled={busy || rueckfrage.trim().length < 10}
          >
            {busy ? "Senden…" : "Senden"}
          </button>
        </form>
      </PortalModalShell>

      <PortalModalShell
        open={mode === "termin"}
        title="Termin"
        subtitle="Vorschlag an Mieter / Kunde"
        onClose={closeSheet}
        variant="edit"
        dirty={Boolean(slotBeginn || slotEnde)}
        closeOnBackdrop={!busy}
      >
        <form onSubmit={sendTermin} className="space-y-3">
          <label className="block space-y-1.5">
            <span className="portal-form-label">Beginn</span>
            <input
              type="datetime-local"
              className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
              value={slotBeginn}
              onChange={(e) => setSlotBeginn(e.target.value)}
              required
              disabled={busy}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="portal-form-label">Ende (optional)</span>
            <input
              type="datetime-local"
              className="portal-input w-full rounded-xl border border-border-default px-3 py-2.5"
              value={slotEnde}
              onChange={(e) => setSlotEnde(e.target.value)}
              disabled={busy}
            />
          </label>
          {error ? <PartnerDetailError message={error} /> : null}
          <button
            type="submit"
            className="btn-pill-primary portal-btn w-full !px-4 !py-2.5"
            disabled={busy || !slotBeginn}
          >
            {busy ? "Senden…" : "Vorschlagen"}
          </button>
        </form>
      </PortalModalShell>
    </>
  );
}
