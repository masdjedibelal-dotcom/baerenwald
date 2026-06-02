"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { submitPartnerAngebot } from "@/app/actions/partner-angebote";
import type { PartnerAnfrageItem } from "@/lib/partner/get-partner-data";
import { cn } from "@/lib/utils";

function fmtDate(v?: string): string {
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preisNetto, setPreisNetto] = useState("");
  const [preisBrutto, setPreisBrutto] = useState("");
  const [notiz, setNotiz] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);

  const eingereicht = Boolean(item.hw_eingereicht_at);
  const kannEinreichen = !eingereicht && item.status.toLowerCase() === "akzeptiert";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pdf) {
      setError("Bitte ein PDF auswählen.");
      return;
    }
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.set("anfrageId", item.id);
    fd.set("preisNetto", preisNetto);
    fd.set("preisBrutto", preisBrutto);
    fd.set("notiz", notiz);
    fd.set("pdf", pdf);
    const res = await submitPartnerAngebot(fd);
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

      {eingereicht ? (
        <div className="space-y-3 rounded-xl border border-border-light bg-muted/20 p-4 text-sm">
          <p className="font-semibold text-text-primary">Dein eingereichtes Angebot</p>
          <p>
            <span className="text-text-tertiary">Eingereicht am:</span>{" "}
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
          {item.hw_angebot_pdf_signed_url ? (
            <a
              href={item.hw_angebot_pdf_signed_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-pill-outline inline-flex !text-[13px]"
            >
              PDF ansehen
            </a>
          ) : null}
        </div>
      ) : null}

      {kannEinreichen ? (
        <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-border-light p-4">
          <p className="text-sm font-semibold text-text-primary">Angebot einreichen</p>
          <p className="text-xs text-text-secondary">
            Preis und PDF-Angebot für Bärenwald. Nach der Einreichung kannst du nichts mehr
            ändern.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-text-tertiary">Preis netto (€)</span>
              <input
                type="text"
                inputMode="decimal"
                value={preisNetto}
                onChange={(e) => setPreisNetto(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border-default bg-surface-card px-3 py-2"
                placeholder="z. B. 4500"
              />
            </label>
            <label className="block text-sm">
              <span className="text-text-tertiary">Preis brutto (€)</span>
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
          <label className="block text-sm">
            <span className="text-text-tertiary">Angebots-PDF</span>
            <input
              type="file"
              accept="application/pdf"
              className="mt-1 w-full text-sm"
              onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-text-tertiary">Notiz (optional)</span>
            <textarea
              value={notiz}
              onChange={(e) => setNotiz(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-border-default bg-surface-card px-3 py-2"
            />
          </label>
          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className={cn("btn-pill-primary w-full !py-2.5", loading && "opacity-60")}
          >
            {loading ? "Wird gesendet…" : "Angebot absenden"}
          </button>
        </form>
      ) : null}

      {!kannEinreichen && !eingereicht ? (
        <p className="text-sm text-text-secondary">
          Diese Anfrage ist noch nicht angenommen. Bitte zuerst unter „Anfragen“ antworten.
        </p>
      ) : null}
    </div>
  );
}
