"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { respondPartnerAuftragZuweisung } from "@/app/actions/partner-auftrag-anfragen";
import {
  HANDWERKER_ABLEHNUNG_GRUND_LABELS,
  HANDWERKER_ABLEHNUNG_GRUND_VALUES,
} from "@/lib/partner/handwerker-ablehnung";
import type { PartnerAuftragItem } from "@/lib/partner/get-partner-data";
import { auftragHwStatusLabel } from "@/lib/partner/partner-portal-phase";
import { cn } from "@/lib/utils";

function fmtDate(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("de-DE");
}

const PENDING_HW = new Set(["angefragt", "ausstehend", "warten", "offen", "zugewiesen"]);

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
    >
      <div className="w-full max-w-md rounded-2xl border border-border-default bg-surface-card p-5 shadow-xl">
        <h4 className="font-display text-lg font-semibold text-text-primary">{title}</h4>
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

export function PartnerAuftragAnfrageDetail({ item }: { item: PartnerAuftragItem }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [confirmAccept, setConfirmAccept] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [grund, setGrund] = useState<string>(HANDWERKER_ABLEHNUNG_GRUND_VALUES[0]);
  const [notiz, setNotiz] = useState("");

  const hwSt = item.hwStatus.toLowerCase();
  const auftragOffen = item.status.toLowerCase() === "offen";
  const kannAntworten =
    auftragOffen || PENDING_HW.has(hwSt) || item.hwStatus === "zugewiesen";

  async function sendAntwort(antwort: "akzeptiert" | "abgelehnt") {
    setLoading(true);
    setError(null);
    const res = await respondPartnerAuftragZuweisung({
      auftragId: item.id,
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
    router.refresh();
  }

  const statusLabel = auftragHwStatusLabel(item.hwStatus);

  return (
    <div className="space-y-4">
      <header className="space-y-2 border-b border-border-light pb-4">
        <p className="text-xs text-text-tertiary">
          Leistungsanfrage · {fmtDate(item.start_datum)}
        </p>
        <h3 className="font-display text-xl font-semibold text-text-primary">
          {item.titel}
        </h3>
        <span className="tag bg-amber-100 text-amber-700">{statusLabel}</span>
        <p className="text-xs text-text-secondary">
          Bärenwald hat dir Leistungen an diesem Projekt zugewiesen. Bitte bestätige
          oder lehne die Anfrage ab.
        </p>
      </header>

      <dl className="overflow-hidden rounded-xl border border-border-light bg-muted/25 text-sm">
        <div className="grid grid-cols-1 gap-0.5 border-b border-border-light px-3 py-2.5 sm:grid-cols-[38%_1fr]">
          <dt className="text-xs text-text-tertiary">PLZ / Ort</dt>
          <dd className="font-semibold text-text-primary">
            {item.plz} {item.ort !== "—" ? `· ${item.ort}` : ""}
          </dd>
        </div>
      </dl>

      {item.positionen.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
            Angefragte Leistungen
          </p>
          <ul className="space-y-2 text-sm">
            {item.positionen.map((p) => (
              <li
                key={p.id}
                className="rounded-lg border border-border-light bg-surface-card px-3 py-2"
              >
                <p className="font-medium text-text-primary">
                  {p.gewerk_name}
                  {p.leistung_name ? ` — ${p.leistung_name}` : ""}
                </p>
                {p.beschreibung ? (
                  <p className="text-text-secondary">{p.beschreibung}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {kannAntworten ? (
        <div className="flex flex-wrap gap-2 border-t border-border-light pt-4">
          <button
            type="button"
            disabled={loading}
            onClick={() => setConfirmAccept(true)}
            className="btn-pill-primary !px-4 !py-2 !text-[13px]"
          >
            Annehmen
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => setShowReject((v) => !v)}
            className="btn-pill-outline !px-4 !py-2 !text-[13px]"
          >
            Ablehnen
          </button>
        </div>
      ) : null}

      {showReject && kannAntworten ? (
        <div className="space-y-3 rounded-xl border border-border-light bg-muted/30 p-4">
          <label className="block text-xs font-semibold text-text-tertiary">
            Ablehnungsgrund
          </label>
          <select
            value={grund}
            onChange={(e) => setGrund(e.target.value)}
            className="w-full rounded-lg border border-border-default bg-surface-card px-3 py-2 text-sm"
          >
            {HANDWERKER_ABLEHNUNG_GRUND_VALUES.map((v) => (
              <option key={v} value={v}>
                {HANDWERKER_ABLEHNUNG_GRUND_LABELS[v]}
              </option>
            ))}
          </select>
          <textarea
            value={notiz}
            onChange={(e) => setNotiz(e.target.value)}
            placeholder="Optionale Notiz"
            rows={3}
            className="w-full rounded-lg border border-border-default bg-surface-card px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => setConfirmReject(true)}
            className="btn-pill-outline !border-red-200 !text-red-800 !px-4 !py-2 !text-[13px]"
          >
            Ablehnung senden
          </button>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmAccept}
        title="Leistung annehmen?"
        description="Du bestätigst die Zuweisung. Sobald Bärenwald das Projekt startet, erscheint es unter Aufträge."
        confirmLabel="Ja, annehmen"
        loading={loading}
        onConfirm={() => sendAntwort("akzeptiert")}
        onCancel={() => setConfirmAccept(false)}
      />
      <ConfirmDialog
        open={confirmReject}
        title="Leistung ablehnen?"
        description="Bärenwald wird informiert. Bitte wähle einen Grund."
        confirmLabel="Ablehnen"
        confirmVariant="danger"
        loading={loading}
        onConfirm={() => sendAntwort("abgelehnt")}
        onCancel={() => setConfirmReject(false)}
      />
    </div>
  );
}
