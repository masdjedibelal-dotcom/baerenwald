"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import {
  einsatzAblehnen,
  einsatzAnnehmen,
  einsatzFertigMelden,
  einsatzMitteilungSenden,
  einsatzRechnungSenden,
  listPartnerEinsaetze,
  type EinsatzMeldungTyp,
  type PartnerEinsatz,
} from "@/app/actions/partner-einsatz";
import { PortalButton } from "@/components/portal/PortalButton";
import { FileUploadField } from "@/components/shared/FileUploadField";
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
  angenommen: { label: "In Bearbeitung", tone: "aktiv" },
  abgelehnt: { label: "Abgelehnt", tone: "danger" },
  fertig: { label: "Erledigt", tone: "fertig" },
};

const REGIE_STAND: Record<PartnerEinsatz["regie"][number]["stand"], string> = {
  offen: "wartet auf Bärenwald",
  angenommen: "angenommen",
  abgelehnt: "abgelehnt",
};

const FOTO_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,application/pdf";

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
  | { art: "update"; einsatz: PartnerEinsatz }
  | { art: "regie"; einsatz: PartnerEinsatz }
  | null;

/**
 * Einsätze im Partner-Portal: höchstens zwei Knöpfe je Stand.
 * Neu: Annehmen / Ablehnen. Läuft: Update, Regie melden, Erledigt. Erledigt: Rechnung hochladen.
 * Updates und Regie sind intern (nur Bärenwald), getrennt vom Bautagebuch für den Kunden.
 */
/** Mehrere Fotos wählen: gestaltete Upload-Zone + Vorschau mit × zum Entfernen (statt nacktem Browser-Feld). */
function FotoAuswahl({
  label,
  dateien,
  onChange,
  max = 6,
}: {
  label: string;
  dateien: File[];
  onChange: (next: File[]) => void;
  max?: number;
}) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const next = dateien.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : ""));
    setUrls(next);
    return () => next.forEach((u) => u && URL.revokeObjectURL(u));
  }, [dateien]);
  return (
    <div className="space-y-2">
      {dateien.length < max ? (
        <FileUploadField
          label={label}
          accept={FOTO_ACCEPT}
          multiple
          size="compact"
          onChange={(files) => onChange([...dateien, ...files].slice(0, max))}
        />
      ) : (
        <span className="portal-text-label text-text-tertiary">{label}</span>
      )}
      {dateien.length ? (
        <div className="flex flex-wrap gap-2">
          {dateien.map((f, i) => (
            <div key={`${f.name}-${i}`} className="relative h-16 w-16 overflow-hidden rounded-card border border-border-default bg-surface-card">
              {urls[i] ? (
                // eslint-disable-next-line @next/next/no-img-element -- lokale Blob-Vorschau
                <img src={urls[i]} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="portal-text-meta block p-1 break-all">{f.name}</span>
              )}
              <PortalButton
                variant="ghost"
                action={false}
                type="button"
                aria-label={`${f.name} entfernen`}
                className="absolute right-0.5 top-0.5 !h-5 !min-h-0 !w-5 !rounded-full !bg-black/55 !p-0 !text-white"
                onClick={() => onChange(dateien.filter((_, j) => j !== i))}
              >
                ×
              </PortalButton>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * @param rechnungHinweis z. B. „Firmendaten fehlen“ — erst beim Abrechnen zeigen, nicht vorne auf der Startseite.
 */
export function PartnerEinsaetzeSection({ rechnungHinweis }: { rechnungHinweis?: ReactNode } = {}) {
  const [einsaetze, setEinsaetze] = useState<PartnerEinsatz[] | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [grund, setGrund] = useState("");
  const [text, setText] = useState("");
  const [dateien, setDateien] = useState<File[]>([]);
  const [positionen, setPositionen] = useState<{ text: string; betrag: string }[]>([
    { text: "", betrag: "" },
  ]);
  const [stunden, setStunden] = useState("");
  const [rechnungPdf, setRechnungPdf] = useState<File | null>(null);

  const laden = useCallback(async () => {
    try {
      const r = await fetch("/api/partner/einsaetze", { cache: "no-store" });
      const res = (await r.json()) as Awaited<ReturnType<typeof listPartnerEinsaetze>>;
      setEinsaetze(res.ok ? res.einsaetze : []);
    } catch {
      setEinsaetze([]);
    }
  }, []);

  useEffect(() => {
    laden();
  }, [laden]);

  function oeffne(d: Dialog) {
    setGrund("");
    setText("");
    setDateien([]);
    setPositionen([{ text: "", betrag: "" }]);
    setStunden("");
    setRechnungPdf(null);
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
      // Rechnung gleich mit (freiwillig — sonst später „Rechnung hochladen“)
      if (rechnungPdf) fd.set("rechnungPdf", rechnungPdf);
      const pos = positionen
        .map((p) => ({ text: p.text.trim(), betrag: Number(p.betrag.replace(",", ".")) || 0 }))
        .filter((p) => p.text && p.betrag > 0);
      fd.set("positionen", JSON.stringify(pos));
      ausfuehren(
        einsatzFertigMelden(fd),
        rechnungPdf || pos.length ? "Erledigt gemeldet, Rechnung eingereicht" : "Als erledigt gemeldet"
      );
      return;
    }
    if (dialog.art === "update" || dialog.art === "regie") {
      const typ: EinsatzMeldungTyp = dialog.art;
      fd.set("typ", typ);
      fd.set("text", text);
      if (typ === "regie") fd.set("stunden", stunden);
      for (const f of dateien) fd.append("dateien", f);
      ausfuehren(einsatzMitteilungSenden(fd), typ === "regie" ? "Regie gemeldet" : "Update gesendet");
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
    ausfuehren(einsatzRechnungSenden(fd), "Rechnung hochgeladen");
  }

  if (!einsaetze || einsaetze.length === 0) return null;

  const titel =
    dialog?.art === "ablehnen"
      ? "Einsatz ablehnen"
      : dialog?.art === "fertig"
        ? "Als erledigt melden"
        : dialog?.art === "update"
          ? "Update senden"
          : dialog?.art === "regie"
            ? "Regie melden"
            : "Rechnung hochladen";
  const confirmLabel =
    dialog?.art === "ablehnen" ? "Ablehnen" : dialog?.art === "fertig" ? "Erledigt" : dialog?.art === "rechnung" ? "Hochladen" : "Senden";
  const updateUnvollstaendig =
    (dialog?.art === "update" && !text.trim() && dateien.length === 0) ||
    (dialog?.art === "regie" && (!text.trim() || !stunden.trim()));

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
                {e.status === "angenommen" && e.letztes_update_at ? (
                  <div className="text-fs-meta text-[var(--p2-sub)]">Letztes Update: {datum(e.letztes_update_at)}</div>
                ) : null}
                {e.regie.map((r) => (
                  <div key={r.id} className="text-fs-meta text-[var(--p2-sub)]">
                    Regie{r.stunden ? ` ${String(r.stunden).replace(".", ",")} Std` : ""}: {REGIE_STAND[r.stand]}
                  </div>
                ))}
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
                      <PortalButton variant="secondary" disabled={busy} onClick={() => oeffne({ art: "update", einsatz: e })}>
                        Update
                      </PortalButton>
                      <PortalButton variant="secondary" disabled={busy} onClick={() => oeffne({ art: "regie", einsatz: e })}>
                        Regie melden
                      </PortalButton>
                      <PortalButton variant="primary" disabled={busy} onClick={() => oeffne({ art: "fertig", einsatz: e })}>
                        Erledigt
                      </PortalButton>
                    </>
                  ) : null}
                  {e.status === "fertig" && !e.rechnung_eingereicht_at ? (
                    <PortalButton variant="primary" disabled={busy} onClick={() => oeffne({ art: "rechnung", einsatz: e })}>
                      Rechnung hochladen
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
          confirmDisabled={busy || (dialog.art === "ablehnen" && !grund.trim()) || updateUnvollstaendig}
          busy={busy}
        >
          {dialog.art === "ablehnen" ? (
            <PortalField label="Grund" hint="Zum Beispiel: kein Termin frei.">
              <PortalTextarea rows={3} value={grund} onChange={(ev) => setGrund(ev.target.value)} />
            </PortalField>
          ) : null}
          {dialog.art === "fertig" ? (
            <>
              <FotoAuswahl label="Fotos (freiwillig)" dateien={dateien} onChange={setDateien} />
              <PortalField label="Notiz (freiwillig)">
                <PortalTextarea rows={3} value={text} onChange={(ev) => setText(ev.target.value)} />
              </PortalField>
              <p className="portal-text-label pt-2">Rechnung (gleich mit oder später)</p>
              {rechnungHinweis}
              <FileUploadField
                label="Rechnung als PDF"
                accept="application/pdf"
                size="compact"
                selectedFile={rechnungPdf}
                onChange={(files) => setRechnungPdf(files[0] ?? null)}
              />
              {positionen.map((p, i) => (
                <div key={i} className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-2">
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
            </>
          ) : null}
          {dialog.art === "update" ? (
            <>
              <PortalField label="Text" hint="Nur für Bärenwald, der Kunde sieht das nicht.">
                <PortalTextarea rows={4} value={text} onChange={(ev) => setText(ev.target.value)} />
              </PortalField>
              <FotoAuswahl label="Fotos" dateien={dateien} onChange={setDateien} />
            </>
          ) : null}
          {dialog.art === "regie" ? (
            <>
              <PortalField label="Stunden">
                <PortalInput inputMode="decimal" value={stunden} onChange={(ev) => setStunden(ev.target.value)} />
              </PortalField>
              <PortalField label="Was wurde gemacht?" hint="Bärenwald nimmt die Regie an oder lehnt sie ab. Sie sehen das hier.">
                <PortalTextarea rows={4} value={text} onChange={(ev) => setText(ev.target.value)} />
              </PortalField>
              <FotoAuswahl label="Fotos (freiwillig)" dateien={dateien} onChange={setDateien} />
            </>
          ) : null}
          {dialog.art === "rechnung" ? (
            <>
              {rechnungHinweis}
              <FileUploadField
                label="Rechnung als PDF"
                accept="application/pdf"
                size="compact"
                selectedFile={dateien[0] ?? null}
                onChange={(files) => setDateien(files.slice(0, 1))}
              />
              {positionen.map((p, i) => (
                <div key={i} className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-2">
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
