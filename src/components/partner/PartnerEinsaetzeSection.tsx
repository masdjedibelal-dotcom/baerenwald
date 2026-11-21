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
  einsatzTerminEintragen,
  listPartnerEinsaetze,
  type EinsatzMeldungTyp,
  type EinsatzUploadOrdner,
  type PartnerEinsatz,
} from "@/app/actions/partner-einsatz";
import { PortalButton } from "@/components/portal/PortalButton";
import { PortalIcon } from "@/components/portal/PortalIcon";
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
import { istTeo, MARKE } from "@/lib/marke";
import { KontaktVorOrt } from "@/components/partner/KontaktVorOrt";

const STATUS: Record<PartnerEinsatz["status"], { label: string; tone: PortalStatusTone }> = {
  gesendet: { label: "Neu", tone: "neu" },
  angenommen: { label: "In Bearbeitung", tone: "aktiv" },
  abgelehnt: { label: "Abgelehnt", tone: "danger" },
  fertig: { label: "Erledigt", tone: "fertig" },
};

const REGIE_STAND: Record<PartnerEinsatz["regie"][number]["stand"], string> = {
  offen: `wartet auf ${MARKE.name}`,
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
  | { art: "termin"; einsatz: PartnerEinsatz }
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
export type PartnerEinsatzZahlen = { neu: number; inArbeit: number; erledigt: number };

export function PartnerEinsaetzeSection({
  rechnungHinweis,
  onZahlen,
  nurAktuell = false,
  ueberschrift = "Ihre Einsätze",
}: {
  rechnungHinweis?: ReactNode;
  /** Kennzahlen nach oben geben (Startseite zeigt sie im Kopf statt in der Liste) */
  onZahlen?: (z: PartnerEinsatzZahlen) => void;
  /** Startseite: nur aktuelle Einsätze, ohne Umschalter Aktuell/Erledigt */
  nurAktuell?: boolean;
  ueberschrift?: string;
} = {}) {
  const [einsaetze, setEinsaetze] = useState<PartnerEinsatz[] | null>(null);
  const [ansicht, setAnsicht] = useState<"aktuell" | "neu" | "erledigt">("aktuell");
  /** Kompakte Karten: Details erst beim Klick */
  const [offenId, setOffenId] = useState<string | null>(null);
  /** TEO: Antippen öffnet ein Blatt mit Details und Aktionen (wie der Einsatz im CRM) */
  const [detailId, setDetailId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [grund, setGrund] = useState("");
  const [text, setText] = useState("");
  const [dateien, setDateien] = useState<File[]>([]);
  const [stunden, setStunden] = useState("");
  // Servus TEO: Ausführungstermin (Datum von–bis)
  const [terminVon, setTerminVon] = useState("");
  const [terminBis, setTerminBis] = useState("");
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
    setTerminVon(d?.art === "termin" ? (d.einsatz.termin_von ?? "").slice(0, 10) : "");
    setTerminBis(
      d?.art === "termin" && d.einsatz.termin_bis && d.einsatz.termin_bis !== d.einsatz.termin_von ? d.einsatz.termin_bis.slice(0, 10) : ""
    );
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
    if (dialog.art === "termin") {
      setBusy(true);
      const res = await safeAction(einsatzTerminEintragen({ einsatzId: id, von: terminVon, bis: terminBis || null }));
      setBusy(false);
      if (!res.ok) {
        portalToastError(res.error);
        return;
      }
      portalToastSuccess("Termin gespeichert", res.mailGesendet ? "Der Kunde bekommt eine Bestätigung per Mail." : undefined);
      setDialog(null);
      await laden();
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
        typ === "regie" ? (istTeo ? "Stunden gemeldet" : "Regie gemeldet") : "Update gesendet"
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
  const detail = detailId ? alle.find((e) => e.id === detailId) ?? null : null;
  const sichtbar = alle.filter((e) =>
    nurAktuell
      ? !istErledigt(e)
      : ansicht === "erledigt"
        ? istErledigt(e)
        : ansicht === "neu"
          ? e.status === "gesendet"
          : !istErledigt(e)
  );
  useEffect(() => {
    if (einsaetze != null) onZahlen?.(kpi);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [einsaetze, kpi.neu, kpi.inArbeit, kpi.erledigt]);

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
            ? (istTeo ? "Stunden melden" : "Regie melden")
            : dialog?.art === "dokument"
              ? "Dokument hochladen"
              : dialog?.art === "termin"
                ? "Ausführungstermin"
                : "Rechnung hochladen";
  const confirmLabel =
    dialog?.art === "annehmen" ? "Annehmen" : dialog?.art === "ablehnen" ? "Ablehnen" : dialog?.art === "fertig" ? "Erledigt" : dialog?.art === "rechnung" || dialog?.art === "dokument" ? "Hochladen" : dialog?.art === "termin" ? "Termin speichern" : "Senden";
  const updateUnvollstaendig =
    (dialog?.art === "update" && !text.trim() && dateien.length === 0) ||
    (dialog?.art === "regie" && (!text.trim() || !stunden.trim())) ||
    (dialog?.art === "termin" && !terminVon);

  return (
    <>
      {/* TEO: Einsätze-Seite filtert über Chips — keine zweite Kachelreihe darüber */}
      {onZahlen || istTeo ? null : (
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
      )}
      {istTeo && !nurAktuell ? (
        // Einsätze-Seite wie im Arbeitsplatz: Titel und blaue Zeile
        <div className="wl-kopf">
          <h1>Einsätze.</h1>
          <p>{einsaetze == null ? "\u00a0" : `${kpi.neu + kpi.inArbeit} aktuell, ${kpi.erledigt} erledigt.`}</p>
        </div>
      ) : null}
      <PortalDetailCard title={istTeo && !nurAktuell ? undefined : ueberschrift} className={istTeo ? "teo-einsatz-liste" : undefined}>
        {nurAktuell ? null : (
        istTeo ? (
          <div className="teo-chips" role="tablist" aria-label="Filter">
            {(
              [
                { id: "aktuell", label: "Aktuell", n: kpi.neu + kpi.inArbeit },
                { id: "neu", label: "Neu", n: kpi.neu },
                { id: "erledigt", label: "Erledigt", n: kpi.erledigt },
              ] as const
            ).map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={ansicht === c.id}
                className={`teo-chip${ansicht === c.id ? " is-on" : ""}`}
                onClick={() => setAnsicht(c.id)}
              >
                {c.label} <span className="teo-chip__n">{c.n}</span>
              </button>
            ))}
          </div>
        ) : (
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
        )
        )}
        {einsaetze == null ? (
          <p className="m-0 text-[var(--p2-sub)]">Wird geladen …</p>
        ) : sichtbar.length === 0 && istTeo ? (
          // Leer-Zustand wie in HV und CRM: Icon + ein kurzer Satz
          <div className="teo-leer">
            <span className="teo-leer__icon" aria-hidden>
              <PortalIcon n="clipboard-list" ctx="default" size={28} />
            </span>
            <p className="teo-leer__titel">
              {ansicht === "neu" ? "Keine neuen Einsätze." : ansicht === "aktuell" ? "Noch keine Einsätze." : "Noch nichts erledigt."}
            </p>
          </div>
        ) : sichtbar.length === 0 ? (
          <p className="m-0 text-[var(--p2-sub)]">
            {ansicht === "neu"
              ? "Keine neuen Einsätze."
              : ansicht === "aktuell"
              ? kpi.erledigt > 0
                ? `Keine aktuellen Einsätze. Neue Einsätze von ${MARKE.name} erscheinen hier.`
                : `Noch keine Einsätze. Sobald ${MARKE.name} Ihnen einen Einsatz schickt, erscheint er hier.`
              : "Noch keine erledigten Einsätze."}
          </p>
        ) : null}
        <div className="flex flex-col gap-4">
          {sichtbar.map((e) => {
            const st = e.vorgang_erledigt ? STATUS.fertig : STATUS[e.status];
            const wann = [datum(e.termin_von), e.termin_bis && e.termin_bis !== e.termin_von ? datum(e.termin_bis) : ""].filter(Boolean).join(" bis ");
            const offen = offenId === e.id;
            const kurz = [wann, e.ort].filter(Boolean).join(" · ");
            return (
              <div key={e.id} className={`partner-einsatz flex flex-col gap-2 border-b border-[var(--p2-line)] pb-4 last:border-b-0${offen ? " is-offen" : ""}`}>
                <button
                  type="button"
                  className="partner-einsatz__kopf flex w-full items-start justify-between gap-3 text-left"
                  aria-expanded={istTeo ? undefined : offen}
                  onClick={() => (istTeo ? setDetailId(e.id) : setOffenId(offen ? null : e.id))}
                >
                  {/* TEO wie im Arbeitsplatz: Titel, darunter Status, darunter Datum/Ort; rechts nur der Pfeil */}
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="min-w-0 font-semibold">{e.titel}</span>
                    {istTeo ? (
                      <span className="partner-einsatz__status">
                        <PortalStatusPill label={st.label} tone={st.tone} />
                      </span>
                    ) : null}
                    {kurz ? <span className="text-fs-meta text-[var(--p2-sub)]">{kurz}</span> : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {istTeo ? null : <PortalStatusPill label={st.label} tone={st.tone} />}
                    <span className="partner-einsatz__pfeil text-[var(--p2-sub)]" aria-hidden>{istTeo ? <PortalIcon ctx="muted" n="chevron-right" size={16} /> : offen ? "▴" : "▾"}</span>
                  </span>
                </button>
                {offen && !istTeo ? (
                <>
                {e.mitarbeiter_name ? (
                  <div className="text-fs-meta text-[var(--p2-sub)]">Vor Ort: {e.mitarbeiter_name}</div>
                ) : null}
                {e.anweisung ? <p className="m-0 whitespace-pre-wrap">{e.anweisung}</p> : null}
                <FotoGalerie urls={e.anweisung_fotos} />
                {/* Wann/Wo stehen schon in der Kopfzeile — hier nur der Kontakt vor Ort (antippbar) */}
                <div className="text-fs-meta text-[var(--p2-sub)]">
                  {e.kontakt_vor_ort ? (
                    <>
                      Kontakt vor Ort: <KontaktVorOrt text={e.kontakt_vor_ort} />
                    </>
                  ) : !e.ort ? (
                    `Ort und Ansprechpartner vor Ort erfahren Sie von ${MARKE.name}.`
                  ) : null}
                </div>
                {e.status === "angenommen" && e.letztes_update_at ? (
                  <div className="text-fs-meta text-[var(--p2-sub)]">Letztes Update: {datum(e.letztes_update_at)}</div>
                ) : null}
                {e.regie.map((r) => (
                  <div key={r.id} className="text-fs-meta text-[var(--p2-sub)]">
                    {istTeo ? "Stunden" : "Regie"}{r.stunden ? ` ${String(r.stunden).replace(".", ",")} Std` : ""}: {REGIE_STAND[r.stand]}
                  </div>
                ))}
                {e.ek_betrag != null ? (
                  <div className="text-fs-meta">
                    Vergütung: {euro(e.ek_betrag)} {e.ek_art}
                  </div>
                ) : null}
                </>
                ) : null}
                {istTeo ? null : offen || e.status === "gesendet" ? (
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
                      {istTeo ? (
                        <PortalButton variant="secondary" disabled={busy} onClick={() => oeffne({ art: "termin", einsatz: e })}>
                          {e.termin_von ? "Termin ändern" : "Termin eintragen"}
                        </PortalButton>
                      ) : null}
                      <PortalButton variant="secondary" disabled={busy} onClick={() => oeffne({ art: "update", einsatz: e })}>
                        Update
                      </PortalButton>
                      <PortalButton variant="secondary" disabled={busy} onClick={() => oeffne({ art: "regie", einsatz: e })}>
                        {istTeo ? "Stunden melden" : "Regie melden"}
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
                ) : null}
              </div>
            );
          })}
        </div>
      </PortalDetailCard>

      {istTeo && detail ? (
        <TeoEinsatzBlatt
          e={detail}
          busy={busy}
          schliessen={() => setDetailId(null)}
          aktion={(d) => {
            setDetailId(null);
            if (d === "annehmen") return annehmen(detail);
            if (d === "dokument") {
              setDokArt("sonstiges");
              return oeffne({ art: "dokument", einsatz: detail });
            }
            oeffne({ art: d, einsatz: detail });
          }}
        />
      ) : null}

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
          {dialog.art === "termin" ? (
            <>
              <PortalField label="Ausführung am">
                <PortalInput type="date" value={terminVon} onChange={(ev) => setTerminVon(ev.target.value)} />
              </PortalField>
              <PortalField label="bis (bei mehreren Tagen)">
                <PortalInput type="date" value={terminBis} onChange={(ev) => setTerminBis(ev.target.value)} />
              </PortalField>
              <p className="text-sm text-p2-sub">Der Kunde bekommt den Termin als Bestätigung per Mail.</p>
            </>
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
              <PortalField label="Text" hint={`Nur für ${MARKE.name}, der Kunde sieht das nicht.`}>
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
              <PortalField label="Was wurde gemacht?" hint={`${MARKE.name} nimmt ${istTeo ? "die Stunden" : "die Regie"} an oder lehnt sie ab. Sie sehen das hier.`}>
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

/** TEO: Einsatz als Blatt — oben Infos als Zeilen, darunter Anweisung und Meldungen, unten ein Hauptknopf. */
function TeoEinsatzBlatt({
  e,
  busy,
  schliessen,
  aktion,
}: {
  e: PartnerEinsatz;
  busy: boolean;
  schliessen: () => void;
  aktion: (d: "annehmen" | "ablehnen" | "termin" | "update" | "regie" | "fertig" | "rechnung" | "dokument") => void;
}) {
  const st = e.vorgang_erledigt ? STATUS.fertig : STATUS[e.status];
  const wann = [datum(e.termin_von), e.termin_bis && e.termin_bis !== e.termin_von ? datum(e.termin_bis) : ""].filter(Boolean).join(" bis ");
  const laeuft = e.status === "angenommen" && !e.vorgang_erledigt;
  const footer =
    e.status === "gesendet" ? (
      <div className="teo-blatt-fuss">
        <PortalButton variant="secondary" disabled={busy} onClick={() => aktion("ablehnen")}>
          Ablehnen
        </PortalButton>
        <PortalButton variant="primary" disabled={busy} onClick={() => aktion("annehmen")}>
          Annehmen
        </PortalButton>
      </div>
    ) : laeuft ? (
      <div className="teo-blatt-fuss">
        <PortalButton variant="primary" className="w-full" disabled={busy} onClick={() => aktion("fertig")}>
          Als erledigt melden
        </PortalButton>
      </div>
    ) : e.status === "fertig" && !e.rechnung_eingereicht_at ? (
      <div className="teo-blatt-fuss">
        <PortalButton variant="primary" className="w-full" disabled={busy} onClick={() => aktion("rechnung")}>
          Rechnung hochladen
        </PortalButton>
      </div>
    ) : undefined;
  return (
    <PortalModalShell open title={e.titel} subtitle={st.label} onClose={schliessen} footer={footer}>
      <div className="teo-blatt">
        <div className="teo-zeilen">
          {laeuft ? (
            <TeoZeile icon="calendar-event" label="Ausführung" wert={wann || "Noch offen"} disabled={busy} onClick={() => aktion("termin")} />
          ) : (
            <TeoInfo label="Ausführung" wert={wann || "Noch offen"} />
          )}
          {e.ort ? <TeoInfo label="Ort" wert={e.ort} /> : null}
          {e.mitarbeiter_name ? <TeoInfo label="Vor Ort" wert={e.mitarbeiter_name} /> : null}
          {e.ek_betrag != null ? <TeoInfo label="Vergütung" wert={`${euro(e.ek_betrag)} ${e.ek_art}`} /> : null}
        </div>
        {e.kontakt_vor_ort ? (
          <p className="teo-blatt__hinweis">
            Kontakt vor Ort: <KontaktVorOrt text={e.kontakt_vor_ort} />
          </p>
        ) : !e.ort ? (
          <p className="teo-blatt__hinweis">Ort und Ansprechpartner vor Ort erfahren Sie von {MARKE.name}.</p>
        ) : null}
        {e.anweisung || e.anweisung_fotos.length ? (
          <div className="teo-blatt__abschnitt">
            <h3>Anweisung</h3>
            {e.anweisung ? <p className="m-0 whitespace-pre-wrap">{e.anweisung}</p> : null}
            <FotoGalerie urls={e.anweisung_fotos} />
          </div>
        ) : null}
        {e.status === "angenommen" || e.status === "fertig" ? (
          <div className="teo-blatt__abschnitt">
            <h3>Melden</h3>
            <div className="teo-zeilen">
              {laeuft ? (
                <>
                  <TeoZeile icon="pencil" label="Update" disabled={busy} onClick={() => aktion("update")} />
                  <TeoZeile icon="list-todo" label="Stunden melden" disabled={busy} onClick={() => aktion("regie")} />
                </>
              ) : null}
              <TeoZeile icon="file-text" label="Dokument hochladen" disabled={busy} onClick={() => aktion("dokument")} />
            </div>
          </div>
        ) : null}
        {e.regie.length || e.letztes_update_at || e.rechnung_eingereicht_at ? (
          <div className="teo-blatt__abschnitt">
            <h3>Verlauf</h3>
            <ul className="teo-blatt__verlauf">
              {e.letztes_update_at ? <li>Letztes Update · {datum(e.letztes_update_at)}</li> : null}
              {e.regie.map((r) => (
                <li key={r.id}>
                  Stunden{r.stunden ? ` ${String(r.stunden).replace(".", ",")} Std` : ""} · {REGIE_STAND[r.stand]}
                </li>
              ))}
              {e.rechnung_eingereicht_at ? (
                <li>{e.rechnung_bezahlt_at ? `Rechnung bezahlt am ${datum(e.rechnung_bezahlt_at)}` : "Rechnung hochgeladen"}</li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </div>
    </PortalModalShell>
  );
}

function TeoInfo({ label, wert }: { label: string; wert: string }) {
  return (
    <div className="teo-zeile teo-zeile--info">
      <span className="teo-zeile__label">{label}</span>
      <span className="teo-zeile__wert">{wert}</span>
    </div>
  );
}

function TeoZeile({ icon, label, wert, disabled, onClick }: { icon: string; label: string; wert?: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" className="teo-zeile" disabled={disabled} onClick={onClick}>
      <span className="teo-zeile__icon"><PortalIcon ctx="row" n={icon} size={18} /></span>
      <span className="teo-zeile__label">{label}</span>
      {wert ? <span className="teo-zeile__wert">{wert}</span> : null}
      <span className="teo-zeile__pfeil"><PortalIcon ctx="muted" n="chevron-right" size={16} /></span>
    </button>
  );
}
