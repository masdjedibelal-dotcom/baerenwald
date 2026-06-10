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
  PartnerDetailLayout,
  PartnerDetailLeistungenList,
  PartnerDetailSection,
  PartnerJobFieldActions,
} from "@/components/partner/PartnerDetailUi";
import { PartnerPortalDetailSections } from "@/components/partner/PartnerPortalDetailSections";
import { BautagebuchAccordionList } from "@/components/shared/BautagebuchAccordionList";
import { PartnerComplianceCheckliste } from "@/components/partner/PartnerComplianceCheckliste";
import { DokumenteTabelle } from "@/components/shared/DokumenteTabelle";
import { FileUploadField } from "@/components/shared/FileUploadField";
import type {
  PartnerAuftragItem,
  PartnerBautagebuchItem,
} from "@/lib/partner/get-partner-data";
import { PartnerStarRatingDisplay } from "@/components/partner/PartnerStarRatingDisplay";
import {
  fmtPartnerDate,
  partnerDetailStatusPillClass,
} from "@/lib/partner/partner-detail-format";
import {
  buildPartnerAuftragPortalSections,
  partnerAuftragDetailMetaLine,
} from "@/lib/partner/partner-portal-display";
import {
  durchschnittAusBewertung,
  formatHandwerkerBewertung,
  HANDWERKER_BEWERTUNG_KATEGORIEN,
  isAuftragAbgeschlossen,
} from "@/lib/partner/handwerker-bewertung-display";
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
    const maxNeu = Math.max(0, PARTNER_MAX_BAUTAGEBUCH_ANHAENGE - bestehendeAnzahl);
    const list = files.slice(0, maxNeu);
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
      className="portal-text-body space-y-3 rounded-xl border border-border-light bg-muted/15 p-4"
    >
      <p className="font-semibold text-text-primary">
        {eintrag ? "Eintrag bearbeiten" : "Neuer Bautagebuch-Eintrag"}
      </p>
      <label className="block">
        <span className="portal-text-meta text-text-tertiary">Titel</span>
        <input
          required
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          className="mt-1 portal-input w-full rounded-xl border border-border-default bg-surface-card px-3 py-3"
        />
      </label>
      <label className="block">
        <span className="portal-text-meta text-text-tertiary">Datum</span>
        <input
          type="date"
          required
          value={datum}
          onChange={(e) => setDatum(e.target.value)}
          className="mt-1 portal-input w-full rounded-xl border border-border-default bg-surface-card px-3 py-3"
        />
      </label>
      <label className="block">
        <span className="portal-text-meta text-text-tertiary">Beschreibung</span>
        <textarea
          value={beschreibung}
          onChange={(e) => setBeschreibung(e.target.value)}
          rows={3}
          className="mt-1 portal-input w-full rounded-xl border border-border-default bg-surface-card px-3 py-3"
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
        <p className="portal-text-body text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={loading}
          className={cn("btn-pill-primary portal-btn !px-4 !py-2.5", loading && "opacity-60")}
        >
          {loading ? "Speichern…" : "Speichern"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="portal-text-body text-text-secondary underline-offset-2 hover:underline"
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
        className="portal-text-meta font-medium text-accent underline-offset-2 hover:underline"
      >
        Bearbeiten
      </button>
      <button
        type="button"
        disabled={deleting}
        onClick={onDelete}
        className="portal-text-meta font-medium text-red-700 underline-offset-2 hover:underline"
      >
        Löschen
      </button>
      {error ? <p className="w-full portal-text-meta text-red-700">{error}</p> : null}
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

  const sections = buildPartnerAuftragPortalSections(item.lead);
  const mapsFooter = (
    <PartnerJobFieldActions
      lead={item.lead}
      plz={item.plz}
      ort={item.ort}
      onAddPhoto={() => {
        setEditId(null);
        setShowNew(true);
      }}
    />
  );

  return (
    <PartnerDetailLayout footer={mapsFooter}>
      <PartnerDetailHero
        title={item.titel}
        metaLine={partnerAuftragDetailMetaLine(item.start_datum, item.end_datum)}
        statusLabel={formatAuftragStatus(item.status)}
        statusPillClass={partnerDetailStatusPillClass(item.status)}
      />

      <PartnerPortalDetailSections sections={sections} />

      {leistungen.length > 0 ? (
        <PartnerDetailSection title="Leistungen">
          <PartnerDetailLeistungenList items={leistungen} />
        </PartnerDetailSection>
      ) : null}

      {isAuftragAbgeschlossen(item.status) ? (
        <PartnerDetailSection title="Deine Bewertung">
          {item.bewertung ? (
            <div className="space-y-4">
              <ul className="space-y-3">
                {HANDWERKER_BEWERTUNG_KATEGORIEN.map((kat) => (
                  <li
                    key={kat.key}
                    className="flex flex-wrap items-center justify-between gap-2"
                  >
                    <span className="portal-text-body text-text-primary">
                      {kat.label}
                    </span>
                    <PartnerStarRatingDisplay
                      value={item.bewertung![kat.key]}
                      size="sm"
                    />
                  </li>
                ))}
              </ul>
              <p className="portal-text-body font-semibold text-text-primary">
                Ø {formatHandwerkerBewertung(durchschnittAusBewertung(item.bewertung))}
              </p>
              {item.bewertung.updated_at ? (
                <p className="portal-text-meta text-text-secondary">
                  Bewertet am {fmtPartnerDate(item.bewertung.updated_at)}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="portal-text-body text-text-secondary">
              Noch keine Bewertung für diesen Auftrag.
            </p>
          )}
        </PartnerDetailSection>
      ) : null}

      {item.vertrag ? (
        <PartnerComplianceCheckliste
          title="Unterlagen"
          items={[
            ...(item.vertrag.compliance_stamm ?? []),
            ...(item.vertrag.compliance_projekt ?? []),
          ]}
          auftragId={item.id}
        />
      ) : null}

      <DokumenteTabelle
        dokumente={item.vertrag?.dokumente_zeilen ?? []}
        heading="Dokumente"
        emptyText="Noch keine Dokumente."
        className="!border-t-0 !pt-0"
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="portal-text-section">Bautagebuch</p>
          {!showNew && !editingEintrag ? (
            <button
              type="button"
              onClick={() => setShowNew(true)}
              className="btn-pill-outline portal-btn-compact !px-3"
            >
              + Eintrag
            </button>
          ) : null}
        </div>
        <p className="portal-text-meta text-text-secondary">
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
