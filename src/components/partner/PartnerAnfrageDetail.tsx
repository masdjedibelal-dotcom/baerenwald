"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { respondPartnerAnfrage } from "@/app/actions/partner-anfragen";
import {
  HANDWERKER_ABLEHNUNG_GRUND_LABELS,
  HANDWERKER_ABLEHNUNG_GRUND_VALUES,
} from "@/lib/partner/handwerker-ablehnung";
import type { PartnerAnfrageItem } from "@/lib/partner/get-partner-data";
import { cn } from "@/lib/utils";

function fmtDate(v?: string): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("de-DE");
}

function statusLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === "akzeptiert") return "Angenommen";
  if (s === "abgelehnt") return "Abgelehnt";
  if (s === "angefragt" || s === "ausstehend") return "Offen";
  return status;
}

function statusPillClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "akzeptiert") return "tag bg-emerald-100 text-emerald-700";
  if (s === "abgelehnt") return "tag bg-red-100 text-red-700";
  return "tag bg-amber-100 text-amber-700";
}

export function PartnerAnfrageDetail({ item }: { item: PartnerAnfrageItem }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [grund, setGrund] = useState<string>(HANDWERKER_ABLEHNUNG_GRUND_VALUES[0]);
  const [notiz, setNotiz] = useState("");

  const beantwortet = Boolean(item.antwort_at);
  const kannAntworten =
    !beantwortet &&
    ["angefragt", "ausstehend", "zugewiesen"].includes(item.status.toLowerCase());

  async function antwort(antwort: "akzeptiert" | "abgelehnt") {
    setLoading(true);
    setError(null);
    const res = await respondPartnerAnfrage({
      anfrageId: item.id,
      antwort,
      grund: antwort === "abgelehnt" ? grund : undefined,
      notiz: notiz.trim() || undefined,
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <header className="space-y-2 border-b border-border-light pb-4">
        <p className="text-xs text-text-tertiary">{fmtDate(item.gesendet_at)}</p>
        <h3 className="font-display text-xl font-semibold text-text-primary">
          {item.gewerk_name}
        </h3>
        <span className={statusPillClass(item.status)}>
          {statusLabel(item.status)}
        </span>
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

      {beantwortet ? (
        <p className="text-sm text-text-secondary">
          Beantwortet am {fmtDate(item.antwort_at)}
          {item.antwort_notiz ? ` — ${item.antwort_notiz}` : ""}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      {kannAntworten ? (
        <div className="space-y-3 border-t border-border-light pt-4">
          {!showReject ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => antwort("akzeptiert")}
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
                  onClick={() => antwort("abgelehnt")}
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
    </div>
  );
}
