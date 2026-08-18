"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { declinePartnerAnfrage } from "@/app/actions/partner-auftrag-bestaetigen";
import { submitPartnerEinholungAngebotPdf } from "@/app/actions/partner-angebote";
import { usePortalBusy } from "@/components/shared/PortalBusyContext";
import { usePortalRefresh } from "@/components/shared/usePortalRefresh";
import { FileUploadField } from "@/components/shared/FileUploadField";
import { DokumenteTabelle, type DokumentZeile } from "@/components/shared/DokumenteTabelle";
import { PartnerHwKalkulationScreen } from "@/components/partner/PartnerHwKalkulationScreen";
import { PartnerLeistungenKonditionenCard } from "@/components/partner/PartnerLeistungenKonditionenCard";
import {
  PortalConfirmDialog,
  PortalDetailError,
  PortalDetailLayout,
  PortalDetailSection,
  PortalDetailStickyActions,
} from "@/components/shared/PortalDetailUi";
import { PortalEntityDetailLayout } from "@/components/shared/PortalEntityDetailLayout";
import { PortalDetailCard } from "@/components/shared/PortalDetailCard";
import { VorgangDetailBlocks } from "@/components/shared/vorgang-detail";
import { buildPartnerVorgangDetailVm } from "@/lib/vorgang/build-vorgang-detail-vm";
import {
  HANDWERKER_ABLEHNUNG_GRUND_LABELS,
  HANDWERKER_ABLEHNUNG_GRUND_VALUES,
} from "@/lib/partner/handwerker-ablehnung";
import { partnerHwDokumentUploadHint } from "@/lib/partner/partner-hw-dokument-copy";
import {
  PARTNER_MAX_ANGEBOT_DATEIEN,
  validatePartnerAngebotFiles,
} from "@/lib/partner/partner-upload-limits";
import { konditionZeilenNurAusHw } from "@/lib/partner/partner-konditionen";
import { resolvePartnerDetailTitelFromAnfrage } from "@/lib/partner/partner-listen-titel";
import {
  partnerDetailStatusPillClass,
  partnerDetailStatusPillStyle,
} from "@/lib/partner/partner-detail-format";
import {
  partnerOffenStatusLabel,
  partnerOffenStatusPillKey,
  type PartnerOffenAngebotItem,
} from "@/lib/partner/partner-offen-status";
import {
  PARTNER_LEISTUNGEN_GESAMT_LABEL,
  partnerDetailOrtMetaLine,
} from "@/lib/partner/partner-portal-display";
import { partnerPortalToast, portalToastError } from "@/lib/shared/portal-toast";
import { usePortalUploadBusy } from "@/components/shared/usePortalUploadBusy";

export function PartnerEinholungDetail({
  item,
  onConfirmed,
  onBack,
}: {
  item: PartnerOffenAngebotItem;
  onConfirmed?: (anfrageId: string) => void;
  onBack?: () => void;
}) {
  const router = useRouter();
  const { refresh } = usePortalRefresh();
  const { runBusy } = usePortalBusy();
  const { uploadBusy, runUpload } = usePortalUploadBusy();
  const [view, setView] = useState<"detail" | "erstellen" | "upload">("detail");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [grund, setGrund] = useState<string>(HANDWERKER_ABLEHNUNG_GRUND_VALUES[0]);
  const [notiz, setNotiz] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const eingereicht = Boolean(item.hw_eingereicht_at?.trim());
  const title =
    item.crm_leistungsumfang?.trim() || resolvePartnerDetailTitelFromAnfrage(item);
  const beschreibung = item.crm_projektbeschreibung?.trim() || "";
  const aufgabeNotiz = item.aufgabe_notiz?.trim() || item.hw_crm_notiz?.trim() || "";
  const statusLabel = partnerOffenStatusLabel(item.offen_karten_typ);
  const statusPillKey = partnerOffenStatusPillKey(item.offen_karten_typ);
  const heroMeta = partnerDetailOrtMetaLine(item.lead);

  const meldeFotos = useMemo(() => {
    const fd = item.lead?.funnel_daten as { fotos?: unknown } | null | undefined;
    if (!Array.isArray(fd?.fotos)) return [] as string[];
    return fd.fotos
      .filter((u): u is string => typeof u === "string" && /^https?:\/\//i.test(u))
      .slice(0, 12);
  }, [item.lead?.funnel_daten]);

  const konditionZeilen = useMemo(() => {
    if (!item.hw_konditionen?.positionen.length) return [];
    return konditionZeilenNurAusHw(item.hw_konditionen);
  }, [item.hw_konditionen]);

  const dokumentZeilen = useMemo((): DokumentZeile[] => {
    const urls = item.hw_angebot_anhang_signed_urls?.length
      ? item.hw_angebot_anhang_signed_urls
      : item.hw_angebot_pdf_signed_url
        ? [item.hw_angebot_pdf_signed_url]
        : [];
    return urls.map((href, i) => ({
      id: `angebot-${i}`,
      name: urls.length > 1 ? `Angebot ${i + 1}` : "Angebot",
      href,
    }));
  }, [item.hw_angebot_anhang_signed_urls, item.hw_angebot_pdf_signed_url]);

  function finish() {
    if (onConfirmed) onConfirmed(item.id);
    else void refresh();
  }

  async function onDecline() {
    setLoading(true);
    setError(null);
    try {
      await runBusy(async () => {
        const res = await declinePartnerAnfrage({
          anfrageId: item.id,
          grund,
          notiz: notiz.trim() || undefined,
        });
        setConfirmReject(false);
        setShowReject(false);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        partnerPortalToast.abgelehnt();
        finish();
      });
    } finally {
      setLoading(false);
    }
  }

  async function onUpload() {
    const err = validatePartnerAngebotFiles(files, { required: true });
    if (err) {
      setPdfError(err);
      return;
    }
    setError(null);
    await runUpload(async () => {
      const fd = new FormData();
      fd.set("anfrageId", item.id);
      for (const f of files) fd.append("pdfs", f);
      const res = await submitPartnerEinholungAngebotPdf(fd);
      if (!res.ok) {
        setError(res.error);
        portalToastError("Upload fehlgeschlagen", res.error);
        return;
      }
      partnerPortalToast.hwAngebotEingereicht();
      finish();
    });
  }

  if (view === "erstellen") {
    return (
      <PortalDetailLayout footer={null}>
        <PortalEntityDetailLayout
          onBack={() => setView("detail")}
          backLabel="← Zurück"
          title={title}
          metaLine={heroMeta}
          statusLabel={statusLabel}
          statusPillClass={partnerDetailStatusPillClass(statusPillKey)}
          statusPillStyle={partnerDetailStatusPillStyle(statusPillKey)}
        >
          <PartnerHwKalkulationScreen
            anfrageId={item.id}
            variant="einholung"
            onDone={finish}
            onCancel={() => setView("detail")}
          />
        </PortalEntityDetailLayout>
      </PortalDetailLayout>
    );
  }

  if (view === "upload") {
    return (
      <PortalDetailLayout
        footer={
          <PortalDetailStickyActions
            primaryLabel={uploadBusy ? "Wird gesendet…" : "Hochladen"}
            onPrimary={() => void onUpload()}
            primaryLoading={uploadBusy}
            primaryDisabled={!files.length || Boolean(pdfError)}
            secondaryLabel="Zurück"
            onSecondary={() => setView("detail")}
            secondaryDisabled={uploadBusy}
          />
        }
      >
        <PortalEntityDetailLayout
          onBack={() => setView("detail")}
          backLabel="← Zurück"
          title={title}
          metaLine={heroMeta}
          statusLabel={statusLabel}
          statusPillClass={partnerDetailStatusPillClass(statusPillKey)}
          statusPillStyle={partnerDetailStatusPillStyle(statusPillKey)}
        >
          <PortalDetailCard title="Angebot hochladen">
            <FileUploadField
              label="Angebot"
              accept="image/jpeg,image/png,image/webp,application/pdf,.pdf"
              multiple
              hint={partnerHwDokumentUploadHint()}
              selectedName={
                files.length === 1
                  ? files[0]!.name
                  : files.length > 1
                    ? `${files.length} Dateien`
                    : null
              }
              selectedFile={files[0] ?? null}
              onChange={(next) => {
                const list = next.slice(0, PARTNER_MAX_ANGEBOT_DATEIEN);
                const err = validatePartnerAngebotFiles(list, { required: false });
                setPdfError(err);
                setFiles(err ? [] : list);
              }}
            />
            {pdfError ? <PortalDetailError message={pdfError} /> : null}
            {error ? <PortalDetailError message={error} /> : null}
          </PortalDetailCard>
        </PortalEntityDetailLayout>
      </PortalDetailLayout>
    );
  }

  const actionFooter = eingereicht ? null : !showReject ? (
    <PortalDetailStickyActions
      primaryLabel="Angebot erstellen"
      onPrimary={() => setView("erstellen")}
      secondaryLabel="Angebot hochladen"
      onSecondary={() => setView("upload")}
    />
  ) : (
    <PortalDetailStickyActions
      primaryLabel="Ablehnung senden"
      onPrimary={() => setConfirmReject(true)}
      primaryLoading={loading}
      secondaryLabel="Zurück"
      onSecondary={() => setShowReject(false)}
      secondaryDisabled={loading}
    />
  );

  return (
    <PortalDetailLayout footer={actionFooter}>
      <PortalEntityDetailLayout
        coverUrl={item.lead?.objekt?.cover_url}
        onBack={onBack ?? (() => router.back())}
        backLabel="← Zurück"
        title={title}
        metaLine={heroMeta}
        statusLabel={eingereicht ? "Eingereicht" : statusLabel}
        statusPillClass={partnerDetailStatusPillClass(eingereicht ? "eingereicht" : statusPillKey)}
        statusPillStyle={partnerDetailStatusPillStyle(eingereicht ? "eingereicht" : statusPillKey)}
      >
        <div className="space-y-5">
          {beschreibung || aufgabeNotiz ? (
            <PortalDetailCard>
              {beschreibung ? (
                <p className="whitespace-pre-wrap portal-text-body">{beschreibung}</p>
              ) : null}
              {aufgabeNotiz ? (
                <p className={`${beschreibung ? "mt-3" : ""} whitespace-pre-wrap portal-text-body`}>
                  {aufgabeNotiz}
                </p>
              ) : null}
            </PortalDetailCard>
          ) : null}

          <VorgangDetailBlocks
            vm={buildPartnerVorgangDetailVm({
              idLabel: item.id.slice(0, 8).toUpperCase(),
              titel: title,
              statusLabel: eingereicht ? "Eingereicht" : statusLabel,
              lead: item.lead,
              plz: item.plz,
              ort: item.ort,
              zeitraum: item.zeitraum,
              gewerkName: item.gewerk_name,
              aufgabeNotiz: null,
              konditionZeilen: [],
              fotos: meldeFotos,
            })}
          />

          {eingereicht && konditionZeilen.length > 0 ? (
            <PortalDetailSection title="Angebot">
              <PartnerLeistungenKonditionenCard
                zeilen={konditionZeilen}
                mode="readonly"
                gesamtLabel={PARTNER_LEISTUNGEN_GESAMT_LABEL}
              />
            </PortalDetailSection>
          ) : null}

          {dokumentZeilen.length ? (
            <DokumenteTabelle dokumente={dokumentZeilen} heading="Dokumente" />
          ) : null}

          {showReject ? (
            <div className="space-y-3 border-t border-border-light pt-4">
              <label className="block space-y-1">
                <span className="portal-form-label">Ablehnungsgrund</span>
                <select
                  value={grund}
                  onChange={(e) => setGrund(e.target.value)}
                  className="portal-input w-full rounded-xl border border-border-default bg-surface-card px-3 py-3"
                >
                  {HANDWERKER_ABLEHNUNG_GRUND_VALUES.map((v) => (
                    <option key={v} value={v}>
                      {HANDWERKER_ABLEHNUNG_GRUND_LABELS[v]}
                    </option>
                  ))}
                </select>
              </label>
              <textarea
                value={notiz}
                onChange={(e) => setNotiz(e.target.value)}
                placeholder="Optionale Notiz"
                rows={3}
                className="portal-input w-full rounded-xl border border-border-default bg-surface-card px-3 py-3"
              />
            </div>
          ) : null}

          {error ? <PortalDetailError message={error} /> : null}

          {!eingereicht && !showReject ? (
            <button
              type="button"
              className="btn-pill-outline"
              disabled={loading}
              onClick={() => setShowReject(true)}
            >
              Ablehnen
            </button>
          ) : null}

          <PortalConfirmDialog
            open={confirmReject}
            title="Ablehnen?"
            description="Bärenwald wird informiert."
            confirmLabel="Ablehnen"
            confirmVariant="danger"
            cancelLabel="Weiter bearbeiten"
            onConfirm={onDecline}
            onCancel={() => setConfirmReject(false)}
            loading={loading}
          />
        </div>
      </PortalEntityDetailLayout>
    </PortalDetailLayout>
  );
}
