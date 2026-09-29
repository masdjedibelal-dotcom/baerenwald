"use client";

import { useCallback, useEffect, useState } from "react";

import {
  einsatzAblehnen,
  einsatzAnnehmen,
  einsatzFertigMelden,
  einsatzMitteilungSenden,
  einsatzRechnungSenden,
  listPartnerEinsaetze,
  type PartnerEinsatz,
} from "@/app/actions/partner-einsatz";
import { PortalButton } from "@/components/portal/PortalButton";
import { PortalDetailCard } from "@/components/shared/PortalDetailCard";
import { PortalField } from "@/components/shared/PortalField";
import { PortalInput, PortalTextarea } from "@/components/shared/PortalFormControls";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { PortalStatusPill } from "@/components/shared/PortalStatusPill";
import { safeAction } from "@/lib/actions/safe-action";
import type { PortalStatusTone } from "@/lib/shared/portal-status-pill";
import { portalToastError, portalToastSuccess } from "@/lib/shared/portal-toast";

const STATUS: Record<PartnerEinsatz["status"], { label: string; tone: PortalStatusTone }> = {
  gesendet: { label: "Neu", tone: "neu" },
  angenommen: { label: "Angenommen", tone: "aktiv" },
  abgelehnt: { label: "Abgelehnt", tone: "danger" },
  fertig: { label: "Fertig", tone: "fertig" },
};

function datum(iso: string | null): string {
  const d = String(iso ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return "";
  const [y, m, t] = d.split("-");
  return `${t}.${m}.${y}`;
}

function euro(n: number): string {
  return n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

type Dialog =
  | { art: "ablehnen"; einsatz: PartnerEinsatz }
  | { art: "fertig"; einsatz: PartnerEinsatz }
  | { art: "rechnung"; einsatz: PartnerEinsatz }
  | { art: "mitteilung"; einsatz: PartnerEinsatz }
  | null;

/**
 * Einsätze im Partner-Portal (Umbau P12): Anweisung und EK. Annehmen oder ablehnen,
 * in einem Schritt fertig melden, danach Rechnung.
 */
export function PartnerEinsaetzeSection() {
  const [einsaetze, setEinsaetze] = useState<PartnerEinsatz[] | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [grund, setGrund] = useState("");
  const [text, setText] = useState("");
  const [dateien, setDateien] = useState<File[]>([]);
  const [positionen, setPositionen] = useState<{ text: string; betrag: string }[]>([
    { text: "", betrag: "" },
  ]);
  const [mitteilungTyp, setMitteilungTyp] = useState<"regie" | "behinderung">("regie");
  const [stunden, setStunden] = useState("");

  const laden = useCallback(async () => {
    const res = await safeAction(listPartnerEinsaetze());
    setEinsaetze(res.ok ? res.einsaetze : []);
  }, []);

  useEffect(() => {
    laden();
  }, [laden]);

  function oeffne(d: Dialog) {
    setGrund("");
    setText("");
    setDateien([]);
    setPositionen([{ text: "", betrag: "" }]);
    setMitteilungTyp("regie");
    setStunden("");
    setDialog(d);
  }

  async function ausfuehren(aufruf: Promise<{ ok: true } | { ok: false; error: string }>, erfolg: string) {
    setBusy(true);
    const res = await safeAction(aufruf);
    setBusy(false);
    if (!res.ok) {
      portalToastError(res.error);
      return;
    }
    portalToastSuccess(erfolg);
    setDialog(null);
    await laden();
  }

  function annehmen(e: PartnerEinsatz) {
    ausfuehren(einsatzAnnehmen(e.id), "Einsatz angenommen");
  }

  function bestaetigen() {
    if (!dialog) return;
    const id = dialog.einsatz.id;
    if (dialog.art === "ablehnen") {
      ausfuehren(einsatzAblehnen(id, grund), "Einsatz abgelehnt");
      return;
    }
    const fd = new FormData();
    fd.set("einsatzId", id);
    if (dialog.art === "fertig") {
      fd.set("text", text);
      for (const f of dateien) fd.append("dateien", f);
      ausfuehren(einsatzFertigMelden(fd), "Fertig gemeldet");
      return;
    }
    if (dialog.art === "mitteilung") {
      fd.set("typ", mitteilungTyp);
      fd.set("text", text);
      if (mitteilungTyp === "regie") fd.set("stunden", stunden);
      for (const f of dateien) fd.append("dateien", f);
      ausfuehren(einsatzMitteilungSenden(fd), "Mitteilung an Bärenwald gesendet");
      return;
    }
    if (dateien[0]) fd.set("pdf", dateien[0]);
    fd.set(
      "positionen",
      JSON.stringify(
        positionen
          .map((p) => ({ text: p.text.trim(), betrag: Number(p.betrag.replace(",", ".")) || 0 }))
          .filter((p) => p.text && p.betrag > 0)
      )
    );
    ausfuehren(einsatzRechnungSenden(fd), "Rechnung gesendet");
  }

  if (!einsaetze || einsaetze.length === 0) return null;

  const titel =
    dialog?.art === "ablehnen"
      ? "Einsatz ablehnen"
      : dialog?.art === "fertig"
        ? "Fertig melden"
        : dialog?.art === "mitteilung"
          ? "Regie oder Behinderung melden"
          : "Rechnung senden";
  const confirmLabel =
    dialog?.art === "ablehnen" ? "Ablehnen" : dialog?.art === "fertig" ? "Fertig melden" : "Senden";

  return (
    <>
      <PortalDetailCard title="Ihre Einsätze">
        <div className="flex flex-col gap-4">
          {einsaetze.map((e) => {
            const st = STATUS[e.status];
            const wann = [datum(e.termin_von), datum(e.termin_bis)].filter(Boolean).join(" bis ");
            return (
              <div key={e.id} className="flex flex-col gap-2 border-b border-[var(--p2-line)] pb-4 last:border-b-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 font-semibold">{e.titel}</div>
                  <PortalStatusPill label={st.label} tone={st.tone} />
                </div>
                {e.anweisung ? <p className="m-0 whitespace-pre-wrap">{e.anweisung}</p> : null}
                <div className="text-fs-meta text-[var(--p2-sub)]">
                  {[wann ? `Wann: ${wann}` : "", e.ort ? `Wo: ${e.ort}` : "", e.kontakt_vor_ort ? `Kontakt: ${e.kontakt_vor_ort}` : ""]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                {e.ek_betrag != null ? (
                  <div className="text-fs-meta">
                    Vergütung: {euro(e.ek_betrag)} {e.ek_art}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {e.status === "gesendet" ? (
                    <>
                      <PortalButton variant="primary" disabled={busy} onClick={() => annehmen(e)}>
                        Annehmen
                      </PortalButton>
                      <PortalButton variant="secondary" disabled={busy} onClick={() => oeffne({ art: "ablehnen", einsatz: e })}>
                        Ablehnen
                      </PortalButton>
                    </>
                  ) : null}
                  {e.status === "angenommen" ? (
                    <>
                      <PortalButton variant="primary" disabled={busy} onClick={() => oeffne({ art: "fertig", einsatz: e })}>
                        Fertig melden
                      </PortalButton>
                      <PortalButton variant="secondary" disabled={busy} onClick={() => oeffne({ art: "mitteilung", einsatz: e })}>
                        Regie oder Behinderung
                      </PortalButton>
                    </>
                  ) : null}
                  {e.status === "fertig" && !e.rechnung_eingereicht_at ? (
                    <PortalButton variant="primary" disabled={busy} onClick={() => oeffne({ art: "rechnung", einsatz: e })}>
                      Rechnung senden
                    </PortalButton>
                  ) : null}
                  {e.rechnung_eingereicht_at ? (
                    <span className="text-fs-meta text-[var(--p2-sub)]">Rechnung eingereicht</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </PortalDetailCard>

      {dialog ? (
        <PortalModalShell
          open
          title={titel}
          subtitle={dialog.einsatz.titel}
          onClose={() => setDialog(null)}
          onConfirm={bestaetigen}
          confirmLabel={confirmLabel}
          confirmDisabled={busy || (dialog.art === "ablehnen" && !grund.trim())}
          busy={busy}
        >
          {dialog.art === "ablehnen" ? (
            <PortalField label="Grund" hint="Zum Beispiel: kein Termin frei.">
              <PortalTextarea rows={3} value={grund} onChange={(ev) => setGrund(ev.target.value)} />
            </PortalField>
          ) : null}
          {dialog.art === "fertig" ? (
            <>
              <PortalField label="Fotos und Dokumente" hint="JPG, PNG oder PDF, zusammen höchstens 4 MB.">
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(ev) => setDateien(Array.from(ev.target.files ?? []))}
                />
              </PortalField>
              <PortalField label="Beschreibung (optional)">
                <PortalTextarea rows={4} value={text} onChange={(ev) => setText(ev.target.value)} />
              </PortalField>
            </>
          ) : null}
          {dialog.art === "mitteilung" ? (
            <>
              <div className="flex gap-2">
                <PortalButton
                  variant={mitteilungTyp === "regie" ? "primary" : "secondary"}
                  onClick={() => setMitteilungTyp("regie")}
                >
                  Regie
                </PortalButton>
                <PortalButton
                  variant={mitteilungTyp === "behinderung" ? "primary" : "secondary"}
                  onClick={() => setMitteilungTyp("behinderung")}
                >
                  Behinderung
                </PortalButton>
              </div>
              {mitteilungTyp === "regie" ? (
                <PortalField label="Stunden" hint="Zusätzliche Arbeit nach Aufwand.">
                  <PortalInput inputMode="decimal" value={stunden} onChange={(ev) => setStunden(ev.target.value)} />
                </PortalField>
              ) : null}
              <PortalField
                label="Beschreibung"
                hint={mitteilungTyp === "regie" ? "Was wurde zusätzlich gemacht und warum?" : "Was hindert Sie an der Arbeit?"}
              >
                <PortalTextarea rows={4} value={text} onChange={(ev) => setText(ev.target.value)} />
              </PortalField>
              <PortalField label="Foto (optional)">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(ev) => setDateien(Array.from(ev.target.files ?? []).slice(0, 3))}
                />
              </PortalField>
            </>
          ) : null}
          {dialog.art === "rechnung" ? (
            <>
              <PortalField label="Rechnung als PDF" hint="Oder unten Positionen eintragen.">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(ev) => setDateien(Array.from(ev.target.files ?? []).slice(0, 1))}
                />
              </PortalField>
              {positionen.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <PortalInput
                    placeholder="Leistung"
                    value={p.text}
                    onChange={(ev) =>
                      setPositionen((l) => l.map((x, j) => (j === i ? { ...x, text: ev.target.value } : x)))
                    }
                  />
                  <PortalInput
                    placeholder="Betrag €"
                    inputMode="decimal"
                    value={p.betrag}
                    onChange={(ev) =>
                      setPositionen((l) => l.map((x, j) => (j === i ? { ...x, betrag: ev.target.value } : x)))
                    }
                  />
                </div>
              ))}
              <PortalButton
                variant="ghost"
                onClick={() => setPositionen((l) => [...l, { text: "", betrag: "" }])}
              >
                Position hinzufügen
              </PortalButton>
            </>
          ) : null}
        </PortalModalShell>
      ) : null}
    </>
  );
}
