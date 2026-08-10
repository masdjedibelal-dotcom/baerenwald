"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  confirmPortalTerminSlot,
  declinePortalTerminSlot,
} from "@/app/actions/portal-termin";
import { PortalDetailSection } from "@/components/shared/PortalDetailUi";
import { formatMeldeSlotLine } from "@/lib/portal2/melde-slots";
import {
  splitMieterTerminSlots,
  type PortalTerminSlot,
} from "@/lib/portal/portal-termin";
import { portalToastSuccess } from "@/lib/shared/portal-toast";

export function PortalHvTerminSection({
  auftragId,
  slots,
  readOnly = false,
}: {
  auftragId: string;
  slots: PortalTerminSlot[];
  /** HV: nur Status anzeigen, keine Mieter-Bestätigung. */
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const { vorgeschlagen, bestaetigt } = splitMieterTerminSlots(slots);

  if (!bestaetigt && vorgeschlagen.length === 0) return null;

  async function confirmSlot(slotId: string) {
    setBusy(slotId);
    setMsg(null);
    const res = await confirmPortalTerminSlot(auftragId, slotId);
    setBusy(null);
    if (!res.ok) {
      setMsg(res.error);
      return;
    }
    portalToastSuccess("Termin bestätigt", "Der Handwerker wurde informiert.");
    router.refresh();
  }

  async function declineSlot(slotId: string) {
    setBusy(slotId);
    setMsg(null);
    const res = await declinePortalTerminSlot(auftragId, slotId);
    setBusy(null);
    if (!res.ok) {
      setMsg(res.error);
      return;
    }
    router.refresh();
  }

  if (bestaetigt) {
    return (
      <PortalDetailSection title="Termin">
        <div className="portal-text-body rounded-xl border border-border-light bg-muted/20 px-3 py-3">
          <p className="font-semibold text-text-primary">
            {readOnly ? "Bestätigter Termin" : "Ihr Termin"}
          </p>
          <p className="mt-1 text-accent">
            {formatMeldeSlotLine(bestaetigt)}
          </p>
        </div>
      </PortalDetailSection>
    );
  }

  if (readOnly) {
    return (
      <PortalDetailSection title="Terminvorschläge">
        <div className="portal-text-body space-y-2 rounded-xl border border-border-light bg-muted/20 p-3">
          <p className="portal-text-meta text-text-secondary">
            Warte auf Terminwahl durch den Melder.
          </p>
          <ul className="space-y-2">
            {vorgeschlagen.map((s) => (
              <li
                key={s.id}
                className="rounded-lg border border-border-light bg-background px-3 py-2"
              >
                <span className="font-medium text-text-primary">
                  {formatMeldeSlotLine(s)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </PortalDetailSection>
    );
  }

  return (
    <PortalDetailSection title="Terminvorschläge">
      <div className="portal-text-body space-y-2 rounded-xl border border-border-light bg-muted/20 p-3">
        <p className="portal-text-meta text-text-secondary">
          Bitte wähle einen Termin — der Handwerker wurde informiert.
        </p>
        <ul className="space-y-2">
          {vorgeschlagen.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-light bg-background px-3 py-2"
            >
              <span className="font-medium text-text-primary">
                {formatMeldeSlotLine(s)}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-pill-outline portal-btn-compact"
                  disabled={busy != null}
                  onClick={() => void confirmSlot(s.id)}
                >
                  {busy === s.id ? "…" : "Bestätigen"}
                </button>
                <button
                  type="button"
                  className="portal-text-label normal-case tracking-normal text-text-tertiary underline"
                  disabled={busy != null}
                  onClick={() => void declineSlot(s.id)}
                >
                  Passt nicht
                </button>
              </div>
            </li>
          ))}
        </ul>
        {msg ? <p className="portal-text-meta text-red-700">{msg}</p> : null}
      </div>
    </PortalDetailSection>
  );
}
