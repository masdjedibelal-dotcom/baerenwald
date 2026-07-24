"use client";

import { useState } from "react";

import {
  createPartnerRueckfrage,
  createPartnerTerminSlots,
} from "@/app/actions/partner-rueckfrage-termine";
import {
  PartnerDetailError,
  PartnerDetailSection,
  PartnerDetailSuccessBox,
} from "@/components/partner/PartnerDetailUi";
import { portalToastSuccess } from "@/lib/shared/portal-toast";

/** Partner: Rückfrage + Terminvorschläge */
export function PartnerTermineRueckfrageSection({ auftragId }: { auftragId: string }) {
  const [rueckfrage, setRueckfrage] = useState("");
  const [slotBeginn, setSlotBeginn] = useState("");
  const [slotEnde, setSlotEnde] = useState("");
  const [busy, setBusy] = useState<"frage" | "termin" | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sendFrage(e: React.FormEvent) {
    e.preventDefault();
    setBusy("frage");
    setError(null);
    const res = await createPartnerRueckfrage(auftragId, rueckfrage);
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    portalToastSuccess("Rückfrage gesendet");
    setRueckfrage("");
    setDone("frage");
  }

  async function sendTermin(e: React.FormEvent) {
    e.preventDefault();
    if (!slotBeginn) return;
    setBusy("termin");
    setError(null);
    const res = await createPartnerTerminSlots(auftragId, [
      { beginn: slotBeginn, ende: slotEnde || undefined },
    ]);
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    portalToastSuccess("Terminvorschlag gesendet");
    setSlotBeginn("");
    setSlotEnde("");
    setDone("termin");
  }

  return (
    <>
      <PartnerDetailSection title="Rückfrage an Bärenwald">
        <form onSubmit={sendFrage} className="space-y-3">
          <textarea
            className="input-field w-full min-h-[80px]"
            placeholder="Frage zum Auftrag (min. 10 Zeichen)"
            value={rueckfrage}
            onChange={(e) => setRueckfrage(e.target.value)}
          />
          <button
            type="submit"
            className="btn-pill-outline portal-btn !px-4 !py-2.5"
            disabled={busy === "frage"}
          >
            {busy === "frage" ? "Senden…" : "Rückfrage senden"}
          </button>
        </form>
        {done === "frage" ? (
          <PartnerDetailSuccessBox>
            <p className="text-sm">Rückfrage wurde übermittelt.</p>
          </PartnerDetailSuccessBox>
        ) : null}
      </PartnerDetailSection>

      <PartnerDetailSection title="Termin vorschlagen">
        <form onSubmit={sendTermin} className="space-y-3">
          <label className="block space-y-1 text-sm">
            <span className="text-text-secondary">Beginn</span>
            <input
              type="datetime-local"
              className="input-field w-full"
              value={slotBeginn}
              onChange={(e) => setSlotBeginn(e.target.value)}
              required
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-text-secondary">Ende (optional)</span>
            <input
              type="datetime-local"
              className="input-field w-full"
              value={slotEnde}
              onChange={(e) => setSlotEnde(e.target.value)}
            />
          </label>
          <button
            type="submit"
            className="btn-pill-outline portal-btn !px-4 !py-2.5"
            disabled={busy === "termin"}
          >
            {busy === "termin" ? "Senden…" : "Termin vorschlagen"}
          </button>
        </form>
        {done === "termin" ? (
          <PartnerDetailSuccessBox>
            <p className="text-sm">Mieter kann den Termin bestätigen.</p>
          </PartnerDetailSuccessBox>
        ) : null}
      </PartnerDetailSection>

      {error ? <PartnerDetailError message={error} /> : null}
    </>
  );
}
