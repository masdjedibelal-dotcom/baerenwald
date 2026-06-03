"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  submitPartnerAngebot,
  submitPartnerRechnung,
} from "@/app/actions/partner-angebote";
import {
  DokumenteTabelle,
  type DokumentZeile,
} from "@/components/shared/DokumenteTabelle";
import { FileUploadField } from "@/components/shared/FileUploadField";
import type { PartnerAnfrageItem } from "@/lib/partner/get-partner-data";
import { cn } from "@/lib/utils";

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="partner-angebot-confirm-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-border-default bg-surface-card p-5 shadow-xl">
        <h4
          id="partner-angebot-confirm-title"
          className="font-display text-lg font-semibold text-text-primary"
        >
          {title}
        </h4>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">{description}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn-pill-outline !px-4 !py-2 !text-[13px]"
          >
            Abbrechen
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={cn(
              "btn-pill-primary !px-4 !py-2 !text-[13px]",
              loading && "opacity-60"
            )}
          >
            {loading ? "Wird gesendet…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function fmtDate(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("de-DE");
}

function fmtEuro(v?: number | null): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(v);
}

function hwStatusLabel(s?: string): string {
  const v = (s ?? "offen").toLowerCase();
  if (v === "eingereicht") return "Eingereicht";
  if (v === "uebernommen") return "Übernommen";
  if (v === "abgelehnt") return "Abgelehnt";
  return "Offen";
}

function hwStatusClass(s?: string): string {
  const v = (s ?? "offen").toLowerCase();
  if (v === "eingereicht" || v === "uebernommen") {
    return "tag bg-emerald-100 text-emerald-700";
  }
  if (v === "abgelehnt") return "tag bg-red-100 text-red-700";
  return "tag bg-amber-100 text-amber-700";
}

export function PartnerAngebotDetail({ item }: { item: PartnerAnfrageItem }) {
  const router = useRouter();
  const [angebotLoading, setAngebotLoading] = useState(false);
  const [rechnungLoading, setRechnungLoading] = useState(false);
  const [angebotError, setAngebotError] = useState<string | null>(null);
  const [rechnungError, setRechnungError] = useState<string | null>(null);
  const [preisNetto, setPreisNetto] = useState("");
  const [preisBrutto, setPreisBrutto] = useState("");
  const [notiz, setNotiz] = useState("");
  const [angebotPdf, setAngebotPdf] = useState<File | null>(null);
  const [rechnungPdf, setRechnungPdf] = useState<File | null>(null);
  const [confirmAngebot, setConfirmAngebot] = useState(false);

  const eingereicht = Boolean(item.hw_eingereicht_at);
  const rechnungEingereicht = Boolean(item.hw_rechnung_eingereicht_at);
  const kannAngebotEinreichen =
    !eingereicht && item.status.toLowerCase() === "akzeptiert";
  const kannRechnungHochladen = eingereicht && !rechnungEingereicht;

  const dokumentZeilen = useMemo((): DokumentZeile[] => {
    const rows: DokumentZeile[] = [];
    if (item.hw_angebot_pdf_signed_url) {
      rows.push({
        id: "hw-angebot-pdf",
        datum: item.hw_eingereicht_at,
        name: "Angebot (eingereicht)",
        href: item.hw_angebot_pdf_signed_url,
      });
    }
    if (item.hw_rechnung_pdf_signed_url) {
      rows.push({
        id: "hw-rechnung-pdf",
        datum: item.hw_rechnung_eingereicht_at,
        name: "Rechnung (eingereicht)",
        href: item.hw_rechnung_pdf_signed_url,
      });
    }
    return rows;
  }, [
    item.hw_angebot_pdf_signed_url,
    item.hw_eingereicht_at,
    item.hw_rechnung_pdf_signed_url,
    item.hw_rechnung_eingereicht_at,
  ]);

  function parseNettoInput(raw: string): number | null {
    const n = Number(raw.replace(",", ".").trim());
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.round(n * 100) / 100;
  }

  async function sendAngebot() {
    if (!angebotPdf) {
      setAngebotError("Bitte ein Angebots-PDF auswählen.");
      return;
    }
    if (parseNettoInput(preisNetto) == null) {
      setAngebotError("Bitte einen gültigen Netto-Preis in Euro angeben.");
      return;
    }
    setAngebotLoading(true);
    setAngebotError(null);
    const fd = new FormData();
    fd.set("anfrageId", item.id);
    fd.set("preisNetto", preisNetto);
    fd.set("preisBrutto", preisBrutto);
    fd.set("notiz", notiz);
    fd.set("pdf", angebotPdf);
    const res = await submitPartnerAngebot(fd);
    setAngebotLoading(false);
    setConfirmAngebot(false);
    if (!res.ok) {
      setAngebotError(res.error);
      return;
    }
    router.refresh();
  }

  function onAngebotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAngebotError(null);
    if (parseNettoInput(preisNetto) == null) {
      setAngebotError("Bitte einen gültigen Netto-Preis in Euro angeben.");
      return;
    }
    if (!angebotPdf) {
      setAngebotError("Bitte ein Angebots-PDF auswählen.");
      return;
    }
    setConfirmAngebot(true);
  }

  async function onRechnungSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rechnungPdf) {
      setRechnungError("Bitte ein Rechnungs-PDF auswählen.");
      return;
    }
    setRechnungLoading(true);
    setRechnungError(null);
    const fd = new FormData();
    fd.set("anfrageId", item.id);
    fd.set("pdf", rechnungPdf);
    const res = await submitPartnerRechnung(fd);
    setRechnungLoading(false);
    if (!res.ok) {
      setRechnungError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <header className="space-y-2 border-b border-border-light pb-4">
        <p className="text-xs text-text-tertiary">
          Angenommen {item.antwort_at ? fmtDate(item.antwort_at) : ""}
        </p>
        <h3 className="font-display text-xl font-semibold text-text-primary">
          {item.gewerk_name}
        </h3>
        <span className={hwStatusClass(item.hw_status)}>
          {hwStatusLabel(item.hw_status)}
        </span>
      </header>

      <dl className="overflow-hidden rounded-xl border border-border-light bg-muted/25 text-sm">
        <div className="grid grid-cols-1 gap-0.5 border-b border-border-light px-3 py-2.5 sm:grid-cols-[38%_1fr]">
          <dt className="text-xs text-text-tertiary">PLZ / Ort</dt>
          <dd className="font-medium text-text-primary">
            {item.plz} {item.ort !== "—" ? item.ort : ""}
          </dd>
        </div>
        {item.zeitraum ? (
          <div className="grid grid-cols-1 gap-0.5 px-3 py-2.5 sm:grid-cols-[38%_1fr]">
            <dt className="text-xs text-text-tertiary">Zeitraum</dt>
            <dd>{item.zeitraum}</dd>
          </div>
        ) : null}
      </dl>

      {item.positionen.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
            Leistungen
          </p>
          <ul className="space-y-2 text-sm">
            {item.positionen.map((p, i) => (
              <li
                key={i}
                className="rounded-lg border border-border-light bg-surface-card px-3 py-2"
              >
                <p className="font-medium text-text-primary">{p.beschreibung}</p>
                <p className="text-xs text-text-secondary">
                  {p.menge}
                  {p.einheit ? ` ${p.einheit}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <DokumenteTabelle
        dokumente={dokumentZeilen}
        heading="Dokumente"
        emptyText="Noch keine Dokumente."
        className="!border-t-0 !pt-0"
      />

      {eingereicht ? (
        <div className="space-y-2 rounded-xl border border-border-light bg-muted/20 p-4 text-sm">
          <p className="font-semibold text-text-primary">Eingereichte Preise</p>
          <p>
            <span className="text-text-tertiary">Angebot eingereicht am:</span>{" "}
            {fmtDate(item.hw_eingereicht_at)}
          </p>
          <p>
            <span className="text-text-tertiary">Netto:</span> {fmtEuro(item.hw_preis_netto)}
          </p>
          <p>
            <span className="text-text-tertiary">Brutto:</span> {fmtEuro(item.hw_preis_brutto)}
          </p>
          {item.hw_notiz ? (
            <p>
              <span className="text-text-tertiary">Notiz:</span> {item.hw_notiz}
            </p>
          ) : null}
          {rechnungEingereicht ? (
            <p>
              <span className="text-text-tertiary">Rechnung hochgeladen am:</span>{" "}
              {fmtDate(item.hw_rechnung_eingereicht_at)}
            </p>
          ) : null}
        </div>
      ) : null}

      {kannAngebotEinreichen ? (
        <form
          onSubmit={onAngebotSubmit}
          className="space-y-3 rounded-xl border border-border-light p-4"
        >
          <p className="text-sm font-semibold text-text-primary">Angebot einreichen</p>
          <p className="text-xs text-text-secondary">
            Netto-Preis und Angebots-PDF werden an Bärenwald gesendet — du erhältst eine
            Bestätigung per E-Mail bei uns. Nach der Einreichung kannst du das Angebot nicht
            mehr ändern.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-1">
              <span className="text-text-tertiary">
                Preis netto (€) <span className="text-red-600">*</span>
              </span>
              <input
                type="text"
                inputMode="decimal"
                required
                value={preisNetto}
                onChange={(e) => setPreisNetto(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border-default bg-surface-card px-3 py-2"
                placeholder="z. B. 4500"
              />
            </label>
            <label className="block text-sm sm:col-span-1">
              <span className="text-text-tertiary">Preis brutto (€, optional)</span>
              <input
                type="text"
                inputMode="decimal"
                value={preisBrutto}
                onChange={(e) => setPreisBrutto(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border-default bg-surface-card px-3 py-2"
                placeholder="z. B. 5355"
              />
            </label>
          </div>
          <FileUploadField
            label="Angebots-PDF"
            accept="application/pdf,.pdf"
            onChange={(files) => setAngebotPdf(files[0] ?? null)}
          />
          <label className="block text-sm">
            <span className="text-text-tertiary">Notiz (optional)</span>
            <textarea
              value={notiz}
              onChange={(e) => setNotiz(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-border-default bg-surface-card px-3 py-2"
            />
          </label>
          {angebotError ? (
            <p className="text-sm text-red-700" role="alert">
              {angebotError}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={angebotLoading}
            className={cn(
              "btn-pill-primary w-full !py-2.5",
              angebotLoading && "opacity-60"
            )}
          >
            {angebotLoading ? "Wird gesendet…" : "Angebot absenden"}
          </button>
        </form>
      ) : null}

      {kannRechnungHochladen ? (
        <form
          onSubmit={onRechnungSubmit}
          className="space-y-3 rounded-xl border border-border-light p-4"
        >
          <p className="text-sm font-semibold text-text-primary">Rechnung hochladen</p>
          <p className="text-xs text-text-secondary">
            Nach Abschluss der Leistung kannst du hier deine Rechnung als PDF einreichen.
            Eine erneute Änderung ist danach nicht möglich.
          </p>
          <FileUploadField
            label="Rechnungs-PDF"
            accept="application/pdf,.pdf"
            onChange={(files) => setRechnungPdf(files[0] ?? null)}
          />
          {rechnungError ? (
            <p className="text-sm text-red-700" role="alert">
              {rechnungError}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={rechnungLoading}
            className={cn(
              "btn-pill-primary w-full !py-2.5",
              rechnungLoading && "opacity-60"
            )}
          >
            {rechnungLoading ? "Wird hochgeladen…" : "Rechnung absenden"}
          </button>
        </form>
      ) : null}

      <ConfirmDialog
        open={confirmAngebot}
        title="Angebot an Bärenwald senden?"
        description="Netto-Preis und PDF werden übermittelt. Bärenwald erhält eine E-Mail mit deinen Angaben und dem Angebots-PDF."
        confirmLabel="Ja, absenden"
        loading={angebotLoading}
        onConfirm={sendAngebot}
        onCancel={() => setConfirmAngebot(false)}
      />

      {!kannAngebotEinreichen && !eingereicht ? (
        <p className="text-sm text-text-secondary">
          Diese Anfrage ist noch nicht angenommen. Bitte zuerst unter „Anfragen“ antworten.
        </p>
      ) : null}
    </div>
  );
}
