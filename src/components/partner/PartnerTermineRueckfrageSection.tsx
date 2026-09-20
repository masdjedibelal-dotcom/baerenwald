"use client";

import { useState } from "react";

import { PortalInput, PortalTextarea } from "@/components/shared/PortalFormControls";
import {
  createPartnerRueckfrage,
  createPartnerTerminSlots,
} from "@/app/actions/partner-rueckfrage-termine";
import {
  PartnerDetailError,
} from "@/components/partner/PartnerDetailUi";
import { PortalDetailCard } from "@/components/shared/PortalDetailCard";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { portalToastSuccess } from "@/lib/shared/portal-toast";
import { PortalButton } from "@/components/portal/PortalButton";
import { TOAST } from '@/lib/portal-copy'

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
    portalToastSuccess(TOAST.gesendet, "Rückfrage übermittelt.");
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
    portalToastSuccess(TOAST.gesendet, "Mieter kann den Termin bestätigen.");
    setSlotBeginn("");
    setSlotEnde("");
    setMode(null);
  }

  return (
    <>
      <PortalDetailCard title="Termin & Rückfrage">
        <p className="mb-3 text-fs-meta leading-relaxed text-text-secondary">
          Termin vorschlagen oder Rückfrage an Bärenwald stellen.
        </p>
        <div className="flex flex-wrap gap-2">
          <PortalButton variant="primary"
            action={false}
            className="btn-pill-primary"
            onClick={() => setMode("termin")}
          >
            Termin
          </PortalButton>
          <PortalButton variant="secondary"
            action={false}
            className="btn-pill-outline"
            onClick={() => setMode("frage")}
          >
            Rückfrage
          </PortalButton>
        </div>
      </PortalDetailCard>

      <PortalModalShell
        open={mode === "frage"}
        title="Rückfrage"
        subtitle="An Bärenwald — min. 10 Zeichen"
        onClose={closeSheet}
        variant="edit"
        dirty={rueckfrage.trim().length > 0}
        closeOnBackdrop={!busy}
        busy={busy}
      >
        <form
          id="partner-rueckfrage-form"
          onSubmit={sendFrage}
          className="space-y-3"
        >
          <PortalTextarea
            className="portal-input w-full min-h-[100px] rounded-field border border-border-default px-3 py-2.5"
            placeholder="Frage zum Auftrag…"
            value={rueckfrage}
            onChange={(e) => setRueckfrage(e.target.value)}
            required
            minLength={10}
            disabled={busy}
          />
          {error ? <PartnerDetailError message={error} /> : null}
          <PortalButton
            variant="primary"
            type="submit"
            action={false}
            className="btn-pill-primary w-full"
            disabled={busy || rueckfrage.trim().length < 10}
          >
            {busy ? "Senden…" : "Senden"}
          </PortalButton>
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
        busy={busy}
      >
        <form
          id="partner-termin-form"
          onSubmit={sendTermin}
          className="space-y-3"
        >
          <label className="block space-y-1.5">
            <span className="portal-form-label">Beginn</span>
            <PortalInput
              type="datetime-local"
              className="portal-input w-full rounded-field border border-border-default px-3 py-2.5"
              value={slotBeginn}
              onChange={(e) => setSlotBeginn(e.target.value)}
              required
              disabled={busy}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="portal-form-label">Ende (optional)</span>
            <PortalInput
              type="datetime-local"
              className="portal-input w-full rounded-field border border-border-default px-3 py-2.5"
              value={slotEnde}
              onChange={(e) => setSlotEnde(e.target.value)}
              disabled={busy}
            />
          </label>
          {error ? <PartnerDetailError message={error} /> : null}
          <PortalButton
            variant="primary"
            type="submit"
            action={false}
            className="btn-pill-primary w-full"
            disabled={busy || !slotBeginn}
          >
            {busy ? "Senden…" : "Vorschlagen"}
          </PortalButton>
        </form>
      </PortalModalShell>
    </>
  );
}
