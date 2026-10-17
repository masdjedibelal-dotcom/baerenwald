"use client";

import { useCallback, useEffect, useState } from "react";

import {
  einsatzFertigMelden,
  einsatzMitteilungSenden,
  listMitarbeiterEinsaetze,
  type MitarbeiterEinsatz,
} from "@/app/actions/partner-einsatz";
import { FotoAuswahl } from "@/components/partner/PartnerEinsaetzeSection";
import { PortalButton } from "@/components/portal/PortalButton";
import { FotoGalerie } from "@/components/shared/FotoGalerie";
import { PortalDetailCard } from "@/components/shared/PortalDetailCard";
import { PortalField } from "@/components/shared/PortalField";
import { PortalTextarea } from "@/components/shared/PortalFormControls";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { PortalStatusPill } from "@/components/shared/PortalStatusPill";
import { safeAction } from "@/lib/actions/safe-action";
import { ladeEinsatzDateienHoch } from "@/lib/partner/einsatz-upload";
import { portalToastError, portalToastSuccess } from "@/lib/shared/portal-toast";
import { MARKE } from "@/lib/marke";

function datum(iso: string | null | undefined): string {
  const d = String(iso ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return "";
  const [y, m, t] = d.split("-");
  return `${t}.${m}.${y}`;
}

/**
 * Partner-Portal für Mitarbeiter: nur die eigenen, angenommenen Einsätze — Termin, Ort, Kontakt,
 * Anweisung und Fotos. Updates/Fotos schicken und erledigt melden. Keine Preise, keine Dokumente,
 * keine Rechnung, keine Firmendaten.
 */
export function PartnerMitarbeiterAnsicht({ name, firma }: { name: string; firma: string }) {
  const [einsaetze, setEinsaetze] = useState<MitarbeiterEinsatz[] | null>(null);
  const [dialog, setDialog] = useState<{ art: "update" | "fertig"; einsatz: MitarbeiterEinsatz } | null>(null);
  const [text, setText] = useState("");
  const [dateien, setDateien] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const laden = useCallback(async () => {
    const r = await safeAction(listMitarbeiterEinsaetze());
    setEinsaetze(r.ok ? r.einsaetze : []);
  }, []);

  useEffect(() => {
    void laden();
  }, [laden]);

  function oeffne(art: "update" | "fertig", einsatz: MitarbeiterEinsatz) {
    setText("");
    setDateien([]);
    setDialog({ art, einsatz });
  }

  async function senden() {
    if (!dialog) return;
    const id = dialog.einsatz.id;
    setBusy(true);
    const hoch = await ladeEinsatzDateienHoch(id, dialog.art === "fertig" ? "fertig" : "mitteilung", dateien).catch(() => ({
      ok: false as const,
      error: "Hochladen fehlgeschlagen. Bitte Verbindung prüfen.",
    }));
    if (!hoch.ok) {
      setBusy(false);
      portalToastError(hoch.error);
      return;
    }
    const res = await safeAction(
      dialog.art === "fertig"
        ? einsatzFertigMelden({ einsatzId: id, text, dateien: hoch.dateien })
        : einsatzMitteilungSenden({ einsatzId: id, typ: "update", text, dateien: hoch.dateien })
    );
    setBusy(false);
    if (!res.ok) {
      portalToastError(res.error);
      return;
    }
    portalToastSuccess(dialog.art === "fertig" ? "Als erledigt gemeldet" : "Update gesendet");
    setDialog(null);
    await laden();
  }

  const laufend = (einsaetze ?? []).filter((e) => e.status === "angenommen");
  const erledigt = (einsaetze ?? []).filter((e) => e.status === "fertig");

  function karte(e: MitarbeiterEinsatz) {
    const wann = [datum(e.termin_von), datum(e.termin_bis)].filter(Boolean);
    const termin = wann.length === 2 && wann[0] !== wann[1] ? `${wann[0]} bis ${wann[1]}` : wann[0] ?? "";
    return (
      <div key={e.id} className="flex flex-col gap-2 border-b border-[var(--p2-line)] pb-4 last:border-b-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 font-semibold">{e.titel}</div>
          <PortalStatusPill label={e.status === "fertig" ? "Erledigt" : "Läuft"} tone={e.status === "fertig" ? "fertig" : "aktiv"} />
        </div>
        <div className="text-fs-meta text-[var(--p2-sub)]">
          {[termin ? `Wann: ${termin}` : "", e.ort ? `Wo: ${e.ort}` : "", e.kontakt_vor_ort ? `Kontakt: ${e.kontakt_vor_ort}` : ""]
            .filter(Boolean)
            .join(" · ")}
        </div>
        {e.anweisung ? <p className="m-0 whitespace-pre-wrap">{e.anweisung}</p> : null}
        <FotoGalerie urls={e.anweisung_fotos} />
        {e.status === "angenommen" ? (
          <div className="flex flex-wrap gap-2">
            <PortalButton variant="secondary" type="button" onClick={() => oeffne("update", e)}>
              Update senden
            </PortalButton>
            <PortalButton variant="primary" type="button" onClick={() => oeffne("fertig", e)}>
              Erledigt melden
            </PortalButton>
          </div>
        ) : e.fertig_at ? (
          <span className="text-fs-meta text-[var(--p2-sub)]">Erledigt am {datum(e.fertig_at)}</span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4 px-4 py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="portal-text-meta text-text-tertiary">Mitarbeiter · {firma}</p>
          <h1 className="portal-text-section">Hallo {name}</h1>
        </div>
        <form action="/partner/auth/signout" method="post">
          <PortalButton variant="ghost" type="submit">
            Abmelden
          </PortalButton>
        </form>
      </div>

      <PortalDetailCard title="Ihre Einsätze">
        {einsaetze == null ? (
          <p className="m-0 text-[var(--p2-sub)]">Wird geladen …</p>
        ) : laufend.length === 0 ? (
          <p className="m-0 text-[var(--p2-sub)]">
            Gerade kein Einsatz für Sie. Sobald {firma} Sie für einen Einsatz einteilt, erscheint er hier.
          </p>
        ) : (
          <div className="flex flex-col gap-4">{laufend.map(karte)}</div>
        )}
      </PortalDetailCard>

      {erledigt.length ? (
        <PortalDetailCard title="Erledigt">
          <div className="flex flex-col gap-4">{erledigt.map(karte)}</div>
        </PortalDetailCard>
      ) : null}

      {dialog ? (
        <PortalModalShell
          open
          title={dialog.art === "fertig" ? "Als erledigt melden" : "Update senden"}
          subtitle={dialog.einsatz.titel}
          onClose={() => setDialog(null)}
          onConfirm={senden}
          confirmLabel={dialog.art === "fertig" ? "Erledigt" : "Senden"}
          confirmDisabled={busy || (dialog.art === "update" && !text.trim() && dateien.length === 0)}
          busy={busy}
        >
          <PortalField label={dialog.art === "fertig" ? "Notiz (freiwillig)" : "Text"} hint={`Geht an ${MARKE.name} und Ihren Betrieb.`}>
            <PortalTextarea rows={4} value={text} onChange={(ev) => setText(ev.target.value)} />
          </PortalField>
          <FotoAuswahl label={dialog.art === "fertig" ? "Fotos (freiwillig)" : "Fotos"} dateien={dateien} onChange={setDateien} />
        </PortalModalShell>
      ) : null}
    </div>
  );
}
