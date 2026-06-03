"use client";

import { useRouter } from "next/navigation";

import { partnerAngebotPortalUrl } from "@/lib/partner/partner-site-url";
import { useState } from "react";

import { respondPartnerAnfrage } from "@/app/actions/partner-anfragen";
import { DokumenteTabelle } from "@/components/shared/DokumenteTabelle";
import {
  HANDWERKER_ABLEHNUNG_GRUND_LABELS,
  HANDWERKER_ABLEHNUNG_GRUND_VALUES,
} from "@/lib/partner/handwerker-ablehnung";
import {
  isPartnerAnfrageOffen,
  partnerAnfrageStatusLabel,
} from "@/lib/partner/partner-anfrage-status";
import type { PartnerAnfrageItem } from "@/lib/partner/get-partner-data";
import { cn } from "@/lib/utils";

function fmtDate(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("de-DE");
}

function statusPillClass(status: string, offen: boolean): string {
  if (offen) return "tag bg-amber-100 text-amber-700";
  const s = status.toLowerCase();
  if (s === "akzeptiert") return "tag bg-emerald-100 text-emerald-700";
  if (s === "abgelehnt") return "tag bg-red-100 text-red-700";
  return "tag bg-amber-100 text-amber-700";
}

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmVariant = "primary",
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: "primary" | "danger";
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
      aria-labelledby="partner-confirm-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-border-default bg-surface-card p-5 shadow-xl">
        <h4 id="partner-confirm-title" className="font-display text-lg font-semibold text-text-primary">
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
              confirmVariant === "danger"
                ? "btn-pill-outline !border-red-200 !text-red-800 !px-4 !py-2 !text-[13px]"
                : "btn-pill-primary !px-4 !py-2 !text-[13px]",
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

export function PartnerAnfrageDetail({ item }: { item: PartnerAnfrageItem }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [confirmAccept, setConfirmAccept] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [grund, setGrund] = useState<string>(HANDWERKER_ABLEHNUNG_GRUND_VALUES[0]);
  const [notiz, setNotiz] = useState("");

  const offen = isPartnerAnfrageOffen(item);
  const beantwortet = Boolean(item.antwort_at);
  const kannAntworten = offen;

  async function sendAntwort(antwort: "akzeptiert" | "abgelehnt") {
    setLoading(true);
    setError(null);
    const res = await respondPartnerAnfrage({
      anfrageId: item.id,
      antwort,
      grund: antwort === "abgelehnt" ? grund : undefined,
      notiz: notiz.trim() || undefined,
    });
    setLoading(false);
    setConfirmAccept(false);
    setConfirmReject(false);
    setShowReject(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (antwort === "akzeptiert") {
      router.push(partnerAngebotPortalUrl(item.id));
      return;
    }
    router.refresh();
  }

  const statusLabel = partnerAnfrageStatusLabel(item);

  return (
    <div className="space-y-4">
      <header className="space-y-2 border-b border-border-light pb-4">
        <p className="text-xs text-text-tertiary">{fmtDate(item.gesendet_at)}</p>
        <h3 className="font-display text-xl font-semibold text-text-primary">
          {item.gewerk_name}
        </h3>
        <span className={statusPillClass(item.status, offen)}>{statusLabel}</span>
      </header>

      <dl className="overflow-hidden rounded-xl border border-border-light bg-muted/25 text-sm">
        <div className="grid grid-cols-1 gap-0.5 border-b border-border-light px-3 py-2.5 sm:grid-cols-[38%_1fr]">
          <dt className="text-xs text-text-tertiary">PLZ / Ort</dt>
          <dd className="font-semibold text-text-primary">
            {item.plz} {item.ort !== "—" ? `· ${item.ort}` : ""}
          </dd>
        </div>
        {item.zeitraum ? (
          <div className="grid grid-cols-1 gap-0.5 border-b border-border-light px-3 py-2.5 sm:grid-cols-[38%_1fr]">
            <dt className="text-xs text-text-tertiary">Zeitraum</dt>
            <dd className="font-semibold text-text-primary">{item.zeitraum}</dd>
          </div>
        ) : null}
        {item.aufgabe_notiz ? (
          <div className="px-3 py-2.5">
            <dt className="text-xs text-text-tertiary">Hinweis von Bärenwald</dt>
            <dd className="mt-1 text-text-primary">{item.aufgabe_notiz}</dd>
          </div>
        ) : null}
      </dl>

      {item.positionen.length > 0 ? (
        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
            Positionen
          </h4>
          <ul className="space-y-1.5 rounded-xl border border-border-light bg-muted/25 px-3 py-2.5">
            {item.positionen.map((p, i) => (
              <li key={i} className="text-sm text-text-primary">
                <span className="text-accent" aria-hidden>
                  •{" "}
                </span>
                {p.beschreibung}
                {p.menge > 1 ? (
                  <span className="text-text-tertiary">
                    {" "}
                    ({p.menge} {p.einheit || "Stk."})
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <DokumenteTabelle
        dokumente={[]}
        heading="Dokumente"
        emptyText="Noch keine Dokumente."
        className="!border-t-0 !pt-0"
      />

      {beantwortet ? (
        <p className="text-sm text-text-secondary">
          Beantwortet am {fmtDate(item.antwort_at)}
          {item.antwort_notiz ? ` — ${item.antwort_notiz}` : ""}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      {kannAntworten ? (
        <div className="space-y-3 border-t border-border-light pt-4">
          <p className="text-xs text-text-secondary">
            Deine Antwort wird an Bärenwald gesendet. Bitte bestätige vor dem Absenden.
          </p>
          {!showReject ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => setConfirmAccept(true)}
                className="btn-pill-primary !px-4 !py-2.5 !text-[13px] disabled:opacity-60"
              >
                Anfrage annehmen
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowReject(true)}
                className="btn-pill-outline !px-4 !py-2.5 !text-[13px]"
              >
                Ablehnen
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-text-secondary">
                  Ablehnungsgrund
                </span>
                <select
                  value={grund}
                  onChange={(e) => setGrund(e.target.value)}
                  className="w-full rounded-xl border border-border-default bg-surface-card px-3 py-2 text-sm"
                >
                  {HANDWERKER_ABLEHNUNG_GRUND_VALUES.map((v) => (
                    <option key={v} value={v}>
                      {HANDWERKER_ABLEHNUNG_GRUND_LABELS[v]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-text-secondary">
                  Notiz (optional)
                </span>
                <textarea
                  value={notiz}
                  onChange={(e) => setNotiz(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-border-default bg-surface-card px-3 py-2 text-sm"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setConfirmReject(true)}
                  className="btn-pill-outline !border-red-200 !text-red-800 !px-4 !py-2.5 !text-[13px]"
                >
                  Ablehnung senden
                </button>
                <button
                  type="button"
                  onClick={() => setShowReject(false)}
                  className="text-sm text-text-secondary underline-offset-2 hover:underline"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {item.status === "akzeptiert" && !item.hw_eingereicht_at ? (
        <p className={cn("rounded-lg bg-accent-light/50 px-3 py-2 text-sm text-accent")}>
          Bitte reiche dein Angebot (Preis + PDF) unter dem Menüpunkt „Angebote“
          ein.
        </p>
      ) : null}

      <ConfirmDialog
        open={confirmAccept}
        title="Anfrage annehmen?"
        description="Bärenwald erhält eine E-Mail mit deiner Zusage. Du wirst zu „Angebote“ weitergeleitet, um Netto-Preis und Angebots-PDF einzureichen."
        confirmLabel="Ja, annehmen und senden"
        loading={loading}
        onConfirm={() => sendAntwort("akzeptiert")}
        onCancel={() => setConfirmAccept(false)}
      />

      <ConfirmDialog
        open={confirmReject}
        title="Anfrage ablehnen?"
        description="Bärenwald erhält eine E-Mail mit deiner Ablehnung. Die Antwort wird im CRM gespeichert."
        confirmLabel="Ja, ablehnen und senden"
        confirmVariant="danger"
        loading={loading}
        onConfirm={() => sendAntwort("abgelehnt")}
        onCancel={() => setConfirmReject(false)}
      />
    </div>
  );
}
