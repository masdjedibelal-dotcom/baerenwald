"use client";

import { listMeineMitarbeiter, type MeinMitarbeiter } from "@/app/actions/partner-mitarbeiter";
import { FotoGalerie } from "@/components/shared/FotoGalerie";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import {
  einsatzAblehnen,
  einsatzAnnehmen,
  einsatzDokumentHochladen,
  einsatzFertigMelden,
  einsatzMitteilungSenden,
  einsatzRechnungSenden,
  listPartnerEinsaetze,
  type EinsatzMeldungTyp,
  type EinsatzUploadOrdner,
  type PartnerEinsatz,
} from "@/app/actions/partner-einsatz";
import { PortalButton } from "@/components/portal/PortalButton";
import { FileUploadField } from "@/components/shared/FileUploadField";
import { ladeEinsatzDateienHoch } from "@/lib/partner/einsatz-upload";
import { PortalDetailCard } from "@/components/shared/PortalDetailCard";
import { PortalField } from "@/components/shared/PortalField";
import { PortalInput, PortalSelect, PortalTextarea } from "@/components/shared/PortalFormControls";
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
  | { art: "annehmen"; einsatz: PartnerEinsatz }
  | { art: "ablehnen"; einsatz: PartnerEinsatz }
  | { art: "fertig"; einsatz: PartnerEinsatz }
  | { art: "rechnung"; einsatz: PartnerEinsatz }
  | { art: "dokument"; einsatz: PartnerEinsatz }
  | { art: "update"; einsatz: PartnerEinsatz }
  | { art: "regie"; einsatz: PartnerEinsatz }
  | null;

/**
 * Einsätze im Partner-Portal: höchstens zwei Knöpfe je Stand.
 * Neu: Annehmen / Ablehnen. Läuft: Update, Regie melden, Erledigt. Erledigt: Rechnung hochladen.
 * Updates und Regie sind intern (nur Bärenwald), getrennt vom Bautagebuch für den Kunden.
 */
/** Mehrere Fotos wählen: gestaltete Upload-Zone + Vorschau mit × zum Entfernen (statt nacktem Browser-Feld). */
export function FotoAuswahl({
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
          hint="PDF oder Foto · max. 10 MB je Datei"
          maxBytes={10 * 1024 * 1024}
          bilderVerkleinern
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
  const [ansicht, setAnsicht] = useState<"aktuell" | "erledigt">("aktuell");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [grund, setGrund] = useState("");
  const [text, setText] = useState("");
  const [dateien, setDateien] = useState<File[]>([]);
  const [stunden, setStunden] = useState("");
  const [dokArt, setDokArt] = useState<"angebot" | "rechnung" | "protokoll" | "sonstiges">("sonstiges");
  const [rechnungPdf, setRechnungPdf] = useState<File | null>(null);
  /** Eigene Mitarbeiter (für „Wer macht den Einsatz?“ beim Annehmen) */
  const [mitarbeiter, setMitarbeiter] = useState<MeinMitarbeiter[]>([]);
  const [maWahl, setMaWahl] = useState("");
  useEffect(() => {
    safeAction(listMeineMitarbeiter())
      .then((r) => setMitarbeiter(r.ok ? r.liste : []))
      .catch(() => setMitarbeiter([]));
  }, []);

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
    if (!mitarbeiter.length) {
      ausfuehren(einsatzAnnehmen(e.id), "Einsatz angenommen");
      return;
    }
    // Mit Mitarbeitern: erst fragen, wer den Einsatz macht (Vorschlag von Bärenwald vorausgewählt)
    setMaWahl(e.mitarbeiter_id ?? "");
    oeffne({ art: "annehmen", einsatz: e });
  }

  /** Dateien direkt in den Speicher laden; bei Fehler Meldung und null. */
  async function hochladen(einsatzId: string, ordner: EinsatzUploadOrdner, files: File[]) {
    const r = await ladeEinsatzDateienHoch(einsatzId, ordner, files).catch(() => ({
      ok: false as const,
      error: "Hochladen fehlgeschlagen. Bitte Verbindung prüfen und erneut versuchen.",
    }));
    if (!r.ok) {
      portalToastError(r.error);
      return null;
    }
    return r.dateien;
  }

  async function bestaetigen() {
    if (!dialog) return;
    const id = dialog.einsatz.id;
    if (dialog.art === "annehmen") {
      await ausfuehren(
        einsatzAnnehmen(id, maWahl || null),
        maWahl ? "Angenommen — Ihr Mitarbeiter wird informiert" : "Einsatz angenommen"
      );
      return;
    }
    if (dialog.art === "ablehnen") {
      await ausfuehren(einsatzAblehnen(id, grund), "Einsatz abgelehnt");
      return;
    }
    // Erst die Dateien hochladen (direkt in den Speicher), dann den Schritt speichern
    setBusy(true);
    if (dialog.art === "fertig") {
      const fotos = await hochladen(id, "fertig", dateien);
      const rechnung = fotos && rechnungPdf ? await hochladen(id, "rechnung", [rechnungPdf]) : [];
      if (!fotos || !rechnung) return setBusy(false);
      await ausfuehren(
        einsatzFertigMelden({ einsatzId: id, text, dateien: fotos, rechnung: rechnung[0] ?? null }),
        rechnungPdf ? "Erledigt gemeldet, Rechnung hochgeladen" : "Als erledigt gemeldet"
      );
      return;
    }
    if (dialog.art === "update" || dialog.art === "regie") {
      const typ: EinsatzMeldungTyp = dialog.art;
      const hoch = await hochladen(id, "mitteilung", dateien);
      if (!hoch) return setBusy(false);
      await ausfuehren(
        einsatzMitteilungSenden({ einsatzId: id, typ, text, stunden, dateien: hoch }),
        typ === "regie" ? "Regie gemeldet" : "Update gesendet"
      );
      return;
    }
    if (dialog.art === "dokument") {
      const hoch = await hochladen(id, dokArt === "rechnung" ? "rechnung" : "dokument", dateien.slice(0, 1));
      if (!hoch) return setBusy(false);
      await ausfuehren(
        einsatzDokumentHochladen({ einsatzId: id, art: dokArt, datei: hoch[0] ?? null }),
        "Dokument hochgeladen"
      );
      return;
    }
    const hoch = await hochladen(id, "rechnung", dateien.slice(0, 1));
    if (!hoch) return setBusy(false);
    await ausfuehren(einsatzRechnungSenden({ einsatzId: id, rechnung: hoch[0] ?? null }), "Rechnung hochgeladen");
  }

  // Startseite nie leer: Kennzahlen und Hinweis auch ohne Einsätze
  const alle = einsaetze ?? [];
  const istErledigt = (e: PartnerEinsatz) => e.vorgang_erledigt || e.status === "fertig";
  const kpi = {
    neu: alle.filter((e) => e.status === "gesendet").length,
    inArbeit: alle.filter((e) => e.status === "angenommen" && !istErledigt(e)).length,
    erledigt: alle.filter(istErledigt).length,
  };
  const sichtbar = alle.filter((e) => (ansicht === "erledigt" ? istErledigt(e) : !istErledigt(e)));

  const titel =
    dialog?.art === "annehmen"
      ? "Einsatz annehmen"
      : dialog?.art === "ablehnen"
      ? "Einsatz ablehnen"
      : dialog?.art === "fertig"
        ? "Als erledigt melden"
        : dialog?.art === "update"
          ? "Update senden"
          : dialog?.art === "regie"
            ? "Regie melden"
            : dialog?.art === "dokument"
              ? "Dokument hochladen"
              : "Rechnung hochladen";
  const confirmLabel =
    dialog?.art === "annehmen" ? "Annehmen" : dialog?.art === "ablehnen" ? "Ablehnen" : dialog?.art === "fertig" ? "Erledigt" : dialog?.art === "rechnung" || dialog?.art === "dokument" ? "Hochladen" : "Senden";
  const updateUnvollstaendig =
    (dialog?.art === "update" && !text.trim() && dateien.length === 0) ||
    (dialog?.art === "regie" && (!text.trim() || !stunden.trim()));

  return (
    <>
      <div className="partner-kpis" role="list" aria-label="Ihre Einsätze in Zahlen">
        {[
          { label: "Neu", wert: kpi.neu },
          { label: "In Arbeit", wert: kpi.inArbeit },
          { label: "Erledigt", wert: kpi.erledigt },
        ].map((k) => (
          <div key={k.label} className="partner-kpi" role="listitem">
            <span className="partner-kpi__wert">{einsaetze == null ? "–" : k.wert}</span>
            <span className="partner-kpi__label">{k.label}</span>
          </div>
        ))}
      </div>
      <PortalDetailCard title="Ihre Einsätze">
        <div className="partner-ansicht" role="tablist" aria-label="Ansicht">
          {(["aktuell", "erledigt"] as const).map((a) => (
            <button
              key={a}
              type="button"
              role="tab"
              aria-selected={ansicht === a}
              className={`partner-ansicht__tab${ansicht === a ? " is-on" : ""}`}
              onClick={() => setAnsicht(a)}
            >
              {a === "aktuell" ? `Aktuell (${kpi.neu + kpi.inArbeit})` : `Erledigt (${kpi.erledigt})`}
            </button>
          ))}
        </div>
        {einsaetze == null ? (
          <p className="m-0 text-[var(--p2-sub)]">Wird geladen …</p>
        ) : sichtbar.length === 0 ? (
          <p className="m-0 text-[var(--p2-sub)]">
            {ansicht === "aktuell"
              ? kpi.erledigt > 0
                ? "Keine aktuellen Einsätze. Neue Einsätze von Bärenwald erscheinen hier."
                : "Noch keine Einsätze. Sobald Bärenwald Ihnen einen Einsatz schickt, erscheint er hier."
              : "Noch keine erledigten Einsätze."}
          </p>
        ) : null}
        <div className="flex flex-col gap-4">
          {sichtbar.map((e) => {
            const st = e.vorgang_erledigt ? STATUS.fertig : STATUS[e.status];
            const wann = [datum(e.termin_von), datum(e.termin_bis)].filter(Boolean).join(" bis ");
            return (
              <div key={e.id} className="flex flex-col gap-2 border-b border-[var(--p2-line)] pb-4 last:border-b-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 font-semibold">{e.titel}</div>
                  <PortalStatusPill label={st.label} tone={st.tone} />
                </div>
                {e.mitarbeiter_name ? (
                  <div className="text-fs-meta text-[var(--p2-sub)]">Vor Ort: {e.mitarbeiter_name}</div>
                ) : null}
                {e.anweisung ? <p className="m-0 whitespace-pre-wrap">{e.anweisung}</p> : null}
                <FotoGalerie urls={e.anweisung_fotos} />
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
                  {e.status === "angenommen" && !e.vorgang_erledigt ? (
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
                  {e.status === "angenommen" || e.status === "fertig" ? (
                    <PortalButton
                      variant="secondary"
                      disabled={busy}
                      onClick={() => {
                        setDokArt("sonstiges");
                        oeffne({ art: "dokument", einsatz: e });
                      }}
                    >
                      Dokument hochladen
                    </PortalButton>
                  ) : null}
                  {e.rechnung_eingereicht_at ? (
                    <span className="text-fs-meta text-[var(--p2-sub)]">
                      {e.rechnung_bezahlt_at ? `Rechnung bezahlt am ${datum(e.rechnung_bezahlt_at)}` : "Rechnung hochgeladen"}
                    </span>
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
          {dialog.art === "annehmen" ? (
            <PortalField label="Wer macht den Einsatz?" hint="Der Mitarbeiter bekommt danach Anweisung und Fotos — ohne Preise.">
              <PortalSelect value={maWahl} onChange={(ev) => setMaWahl(ev.target.value)}>
                <option value="">Ich selbst / noch offen</option>
                {mitarbeiter.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                    {m.rolle ? ` · ${m.rolle}` : ""}
                  </option>
                ))}
              </PortalSelect>
            </PortalField>
          ) : null}
          {dialog.art === "ablehnen" ? (
            <PortalField label="Grund" hint="Zum Beispiel: kein Termin frei.">
              <PortalTextarea rows={3} value={grund} onChange={(ev) => setGrund(ev.target.value)} />
            </PortalField>
          ) : null}
          {dialog.art === "fertig" ? (
            <>
              <FotoAuswahl label="Fotos oder Dokumente (freiwillig)" dateien={dateien} onChange={setDateien} />
              <PortalField label="Notiz (freiwillig)">
                <PortalTextarea rows={3} value={text} onChange={(ev) => setText(ev.target.value)} />
              </PortalField>
              <p className="portal-text-label pt-2">Rechnung (gleich mit oder später)</p>
              {rechnungHinweis}
              <FileUploadField
                label="Rechnung als PDF"
                accept="application/pdf"
                hint="PDF · max. 10 MB"
                maxBytes={10 * 1024 * 1024}
                size="compact"
                selectedFile={rechnungPdf}
                onChange={(files) => setRechnungPdf(files[0] ?? null)}
              />
            </>
          ) : null}
          {dialog.art === "update" ? (
            <>
              <PortalField label="Text" hint="Nur für Bärenwald, der Kunde sieht das nicht.">
                <PortalTextarea rows={4} value={text} onChange={(ev) => setText(ev.target.value)} />
              </PortalField>
              <FotoAuswahl label="Fotos oder Dokumente" dateien={dateien} onChange={setDateien} />
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
              <FotoAuswahl label="Fotos oder Dokumente (freiwillig)" dateien={dateien} onChange={setDateien} />
            </>
          ) : null}
          {dialog.art === "dokument" ? (
            <>
              <PortalField label="Art">
                <PortalSelect
                  value={dokArt}
                  onChange={(ev) => setDokArt(ev.target.value as typeof dokArt)}
                >
                  <option value="angebot">Angebot</option>
                  {!dialog.einsatz.rechnung_eingereicht_at ? <option value="rechnung">Rechnung</option> : null}
                  <option value="protokoll">Protokoll</option>
                  <option value="sonstiges">Sonstiges</option>
                </PortalSelect>
              </PortalField>
              <FileUploadField
                label={dokArt === "rechnung" ? "Rechnung als PDF" : "Datei"}
                accept={dokArt === "rechnung" ? "application/pdf" : "application/pdf,image/*"}
                hint={dokArt === "rechnung" ? "PDF · max. 10 MB" : "PDF oder Foto · max. 10 MB"}
                maxBytes={10 * 1024 * 1024}
                bilderVerkleinern
                size="compact"
                selectedFile={dateien[0] ?? null}
                onChange={(files) => setDateien(files.slice(0, 1))}
              />
            </>
          ) : null}
          {dialog.art === "rechnung" ? (
            <>
              {rechnungHinweis}
              <FileUploadField
                label="Rechnung als PDF"
                accept="application/pdf"
                hint="PDF · max. 10 MB"
                maxBytes={10 * 1024 * 1024}
                size="compact"
                selectedFile={dateien[0] ?? null}
                onChange={(files) => setDateien(files.slice(0, 1))}
              />
            </>
          ) : null}
        </PortalModalShell>
      ) : null}
    </>
  );
}
