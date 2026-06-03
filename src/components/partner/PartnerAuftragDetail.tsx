"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  createPartnerBautagebuchEintrag,
  deletePartnerBautagebuchEintrag,
  updatePartnerBautagebuchEintrag,
} from "@/app/actions/partner-bautagebuch";
import {
  PartnerDetailHero,
  PartnerDetailKeyValues,
  PartnerDetailLayout,
  PartnerDetailLeistungenList,
  PartnerDetailSection,
} from "@/components/partner/PartnerDetailUi";
import { BautagebuchAccordionList } from "@/components/shared/BautagebuchAccordionList";
import { DokumenteTabelle } from "@/components/shared/DokumenteTabelle";
import { FileUploadField } from "@/components/shared/FileUploadField";
import type {
  PartnerAuftragItem,
  PartnerBautagebuchItem,
} from "@/lib/partner/get-partner-data";
import {
  fmtPartnerDate,
  fmtPartnerMetaLine,
  partnerDetailStatusPillClass,
} from "@/lib/partner/partner-detail-format";
import {
  PARTNER_MAX_BAUTAGEBUCH_ANHAENGE,
  PARTNER_MAX_PDF_MB,
  PARTNER_MAX_PHOTO_MB,
  validatePartnerBautagebuchFiles,
} from "@/lib/partner/partner-upload-limits";
import { cn } from "@/lib/utils";

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
  const [anhaenge, setAnhaenge] = useState<File[]>([]);

  const bestehendeAnzahl = eintrag?.foto_urls.length ?? 0;

  function handleAnhaengeChange(files: File[]) {
    const list = files.slice(0, PARTNER_MAX_BAUTAGEBUCH_ANHAENGE);
    const err = validatePartnerBautagebuchFiles(list, bestehendeAnzahl);
    if (err) {
      setError(err);
      setAnhaenge([]);
      return;
    }
    setError(null);
    setAnhaenge(list);
  }

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
    for (const f of anhaenge) fd.append("photos", f);

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
      <FileUploadField
        label="Fotos & Dokumente"
        hint={
          eintrag
            ? `Neue Dateien werden ergänzt (max. ${PARTNER_MAX_BAUTAGEBUCH_ANHAENGE} gesamt, davon ${bestehendeAnzahl} bereits). Fotos max. ${PARTNER_MAX_PHOTO_MB} MB, PDF max. ${PARTNER_MAX_PDF_MB} MB.`
            : `Fotos (JPG/PNG/WebP, max. ${PARTNER_MAX_PHOTO_MB} MB) oder PDF (max. ${PARTNER_MAX_PDF_MB} MB), bis ${PARTNER_MAX_BAUTAGEBUCH_ANHAENGE} Dateien.`
        }
        accept="image/jpeg,image/png,image/webp,application/pdf,.pdf"
        multiple
        selectedName={
          anhaenge.length > 0
            ? anhaenge.length === 1
              ? anhaenge[0].name
              : `${anhaenge.length} Dateien ausgewählt`
            : null
        }
        onChange={handleAnhaengeChange}
      />
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

function BautagebuchEintragActions({
  auftragId,
  eintrag,
  onEdit,
}: {
  auftragId: string;
  eintrag: PartnerBautagebuchItem;
  onEdit: () => void;
}) {
  const router = useRouter();
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

  if (!eintrag.own || eintrag.fuer_kunde_freigegeben) return null;

  return (
    <>
      <button
        type="button"
        onClick={onEdit}
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
      {error ? <p className="w-full text-xs text-red-700">{error}</p> : null}
    </>
  );
}

function formatAuftragStatus(status: string): string {
  const s = status.toLowerCase();
  if (s === "in_arbeit") return "In Arbeit";
  if (s === "abgeschlossen") return "Abgeschlossen";
  if (s === "storniert") return "Storniert";
  return status;
}

export function PartnerAuftragDetail({ item }: { item: PartnerAuftragItem }) {
  const [showNew, setShowNew] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const accordionEintraege = useMemo(
    () =>
      item.bautagebuch.map((e) => ({
        id: e.id,
        datum: e.datum,
        titel: e.titel,
        beschreibung: e.beschreibung,
        fotos: e.foto_signed_urls,
        badges: (
          <>
            {e.own ? (
              <span className="tag bg-accent-light text-accent">Dein Eintrag</span>
            ) : null}
            {e.fuer_kunde_freigegeben ? (
              <span className="tag bg-emerald-100 text-emerald-700">Freigegeben</span>
            ) : null}
          </>
        ),
        actions:
          e.own && !e.fuer_kunde_freigegeben ? (
            <BautagebuchEintragActions
              auftragId={item.id}
              eintrag={e}
              onEdit={() => setEditId(e.id)}
            />
          ) : undefined,
      })),
    [item.bautagebuch, item.id]
  );

  const editingEintrag = editId
    ? item.bautagebuch.find((e) => e.id === editId)
    : undefined;

  const leistungen = item.positionen.map((p) => ({
    id: p.id,
    title: [p.gewerk_name, p.leistung_name].filter(Boolean).join(" — "),
    beschreibung: p.beschreibung,
  }));

  const fortschrittSubtitle =
    item.fortschritt != null ? `Fortschritt: ${item.fortschritt} %` : undefined;

  return (
    <PartnerDetailLayout>
      <PartnerDetailHero
        title={item.titel}
        metaLine={fmtPartnerMetaLine({
          plz: item.plz,
          ort: item.ort,
          date: item.start_datum,
        })}
        statusLabel={formatAuftragStatus(item.status)}
        statusPillClass={partnerDetailStatusPillClass(item.status)}
        subtitle={fortschrittSubtitle}
      />

      <PartnerDetailSection title="Beschreibung">
        <PartnerDetailKeyValues
          rows={[
            { label: "Start", value: item.start_datum ? fmtPartnerDate(item.start_datum) : null },
          ]}
        />
      </PartnerDetailSection>

      {leistungen.length > 0 ? (
        <PartnerDetailSection title="Leistungen">
          <PartnerDetailLeistungenList items={leistungen} />
        </PartnerDetailSection>
      ) : null}

      <DokumenteTabelle
        dokumente={[]}
        heading="Dokumente"
        emptyText="Noch keine Dokumente."
        className="!border-t-0 !pt-0"
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-text-primary">Bautagebuch</p>
          {!showNew && !editingEintrag ? (
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

        {editingEintrag ? (
          <BautagebuchForm
            auftragId={item.id}
            eintrag={editingEintrag}
            onDone={() => setEditId(null)}
          />
        ) : null}

        <BautagebuchAccordionList
          eintraege={accordionEintraege}
          className="!border-t-0 !pt-0"
          emptyText="Noch keine Einträge im Bautagebuch."
        />
      </div>
    </PartnerDetailLayout>
  );
}
