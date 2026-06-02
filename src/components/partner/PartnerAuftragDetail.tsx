"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  createPartnerBautagebuchEintrag,
  deletePartnerBautagebuchEintrag,
  updatePartnerBautagebuchEintrag,
} from "@/app/actions/partner-bautagebuch";
import type {
  PartnerAuftragItem,
  PartnerBautagebuchItem,
} from "@/lib/partner/get-partner-data";
import { cn } from "@/lib/utils";

function fmtDate(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("de-DE");
}

function statusPillClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "abgeschlossen") return "tag bg-emerald-100 text-emerald-700";
  if (s === "storniert") return "tag bg-red-100 text-red-700";
  if (s === "in_arbeit") return "tag bg-blue-100 text-blue-800";
  return "tag bg-amber-100 text-amber-700";
}

function BautagebuchForm({
  auftragId,
  eintrag,
  onDone,
}: {
  auftragId: string;
  eintrag?: PartnerBautagebuchItem;
  onDone: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titel, setTitel] = useState(eintrag?.titel ?? "");
  const [beschreibung, setBeschreibung] = useState(eintrag?.beschreibung ?? "");
  const [datum, setDatum] = useState(
    eintrag?.datum ?? new Date().toISOString().slice(0, 10)
  );
  const [photos, setPhotos] = useState<File[]>([]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.set("auftragId", auftragId);
    if (eintrag) {
      fd.set("eintragId", eintrag.id);
      fd.set("keepFotoPaths", eintrag.foto_urls.join(","));
    }
    fd.set("titel", titel);
    fd.set("beschreibung", beschreibung);
    fd.set("datum", datum);
    for (const f of photos) fd.append("photos", f);

    const res = eintrag
      ? await updatePartnerBautagebuchEintrag(fd)
      : await createPartnerBautagebuchEintrag(fd);

    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
    onDone();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-xl border border-border-light bg-muted/15 p-4 text-sm"
    >
      <p className="font-semibold text-text-primary">
        {eintrag ? "Eintrag bearbeiten" : "Neuer Bautagebuch-Eintrag"}
      </p>
      <label className="block">
        <span className="text-xs text-text-tertiary">Titel</span>
        <input
          required
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border-default bg-surface-card px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-xs text-text-tertiary">Datum</span>
        <input
          type="date"
          required
          value={datum}
          onChange={(e) => setDatum(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border-default bg-surface-card px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-xs text-text-tertiary">Beschreibung</span>
        <textarea
          value={beschreibung}
          onChange={(e) => setBeschreibung(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-xl border border-border-default bg-surface-card px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-xs text-text-tertiary">
          Fotos {eintrag ? "(neue werden ergänzt)" : ""}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="mt-1 w-full text-sm"
          onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
        />
      </label>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={loading}
          className={cn("btn-pill-primary !px-4 !py-2 !text-[13px]", loading && "opacity-60")}
        >
          {loading ? "Speichern…" : "Speichern"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-sm text-text-secondary underline-offset-2 hover:underline"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}

function BautagebuchEintragCard({
  auftragId,
  eintrag,
}: {
  auftragId: string;
  eintrag: PartnerBautagebuchItem;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (!confirm("Eintrag wirklich löschen?")) return;
    setDeleting(true);
    setError(null);
    const res = await deletePartnerBautagebuchEintrag({
      auftragId,
      eintragId: eintrag.id,
    });
    setDeleting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  if (editing && eintrag.own) {
    return (
      <BautagebuchForm
        auftragId={auftragId}
        eintrag={eintrag}
        onDone={() => setEditing(false)}
      />
    );
  }

  return (
    <li className="rounded-xl border border-border-light bg-surface-card p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-text-primary">{eintrag.titel}</p>
          <p className="text-xs text-text-tertiary">{fmtDate(eintrag.datum)}</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {eintrag.own ? (
            <span className="tag bg-accent-light text-accent">Dein Eintrag</span>
          ) : null}
          {eintrag.fuer_kunde_freigegeben ? (
            <span className="tag bg-emerald-100 text-emerald-700">Freigegeben</span>
          ) : null}
        </div>
      </div>
      {eintrag.beschreibung ? (
        <p className="mt-2 whitespace-pre-wrap text-text-secondary">
          {eintrag.beschreibung}
        </p>
      ) : null}
      {eintrag.foto_signed_urls.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {eintrag.foto_signed_urls.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block h-16 w-16 overflow-hidden rounded-lg border border-border-light"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
            </a>
          ))}
        </div>
      ) : null}
      {eintrag.own && !eintrag.fuer_kunde_freigegeben ? (
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-medium text-accent underline-offset-2 hover:underline"
          >
            Bearbeiten
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={onDelete}
            className="text-xs font-medium text-red-700 underline-offset-2 hover:underline"
          >
            Löschen
          </button>
        </div>
      ) : null}
      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
    </li>
  );
}

export function PartnerAuftragDetail({ item }: { item: PartnerAuftragItem }) {
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="space-y-4">
      <header className="space-y-2 border-b border-border-light pb-4">
        <h3 className="font-display text-xl font-semibold text-text-primary">
          {item.titel}
        </h3>
        <span className={statusPillClass(item.status)}>{item.status}</span>
        {item.fortschritt != null ? (
          <p className="text-sm text-text-secondary">
            Fortschritt: {item.fortschritt}%
          </p>
        ) : null}
      </header>

      <dl className="overflow-hidden rounded-xl border border-border-light bg-muted/25 text-sm">
        <div className="grid grid-cols-1 gap-0.5 border-b border-border-light px-3 py-2.5 sm:grid-cols-[38%_1fr]">
          <dt className="text-xs text-text-tertiary">PLZ / Ort</dt>
          <dd>
            {item.plz} {item.ort !== "—" ? item.ort : ""}
          </dd>
        </div>
        {item.start_datum ? (
          <div className="grid grid-cols-1 gap-0.5 px-3 py-2.5 sm:grid-cols-[38%_1fr]">
            <dt className="text-xs text-text-tertiary">Start</dt>
            <dd>{fmtDate(item.start_datum)}</dd>
          </div>
        ) : null}
      </dl>

      {item.positionen.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
            Deine Positionen
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

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-text-primary">Bautagebuch</p>
          {!showNew ? (
            <button
              type="button"
              onClick={() => setShowNew(true)}
              className="btn-pill-outline !px-3 !py-1.5 !text-[12px]"
            >
              + Eintrag
            </button>
          ) : null}
        </div>
        <p className="text-xs text-text-secondary">
          Einträge werden von Bärenwald geprüft, bevor sie für Kunden sichtbar werden.
        </p>

        {showNew ? (
          <BautagebuchForm auftragId={item.id} onDone={() => setShowNew(false)} />
        ) : null}

        {item.bautagebuch.length === 0 ? (
          <p className="text-sm text-text-secondary">Noch keine Einträge.</p>
        ) : (
          <ul className="space-y-3">
            {item.bautagebuch.map((e) => (
              <BautagebuchEintragCard key={e.id} auftragId={item.id} eintrag={e} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
