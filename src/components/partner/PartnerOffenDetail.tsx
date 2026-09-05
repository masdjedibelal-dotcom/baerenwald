"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  confirmPartnerAuftrag,
  confirmPartnerAuftragZuweisung,
  declinePartnerAnfrage,
} from "@/app/actions/partner-auftrag-bestaetigen";
import { usePortalBusy } from "@/components/shared/PortalBusyContext";
import { usePortalRefresh } from "@/components/shared/usePortalRefresh";
import { VorgangDetailBlocks } from "@/components/shared/vorgang-detail";
import { buildPartnerVorgangDetailVm } from "@/lib/vorgang/build-vorgang-detail-vm";
import { PartnerPflichtenCard } from "@/components/partner/PartnerPflichtenCard";
import { PartnerProjektvertragPaket } from "@/components/partner/PartnerProjektvertragPaket";
import { PartnerLeistungenKonditionenCard } from "@/components/partner/PartnerLeistungenKonditionenCard";
import {
  PortalConfirmDialog,
  PortalDetailError,
  PortalDetailInfoBox,
  PortalDetailLayout,
  PortalDetailSection,
  PortalDetailStickyActions,
} from "@/components/shared/PortalDetailUi";
import { PortalEntityDetailLayout } from "@/components/shared/PortalEntityDetailLayout";
import { PartnerHwKalkulationScreen } from "@/components/partner/PartnerHwKalkulationScreen";
import { PartnerFirmendatenFehlenDialog } from "@/components/partner/PartnerFirmendatenFehlenDialog";
import { DokumenteTabelle, type DokumentZeile } from "@/components/shared/DokumenteTabelle";
import { tryCreatePartnerAutoAngebot } from "@/lib/partner/try-partner-auto-angebot";
import type { PartnerOffenAngebotItem } from "@/lib/partner/partner-offen-status";
import { resolvePartnerDetailTitelFromAnfrage } from "@/lib/partner/partner-listen-titel";
import {
  partnerDetailStatusPillClass,
  partnerDetailStatusPillStyle,
} from "@/lib/partner/partner-detail-format";
import { partnerPortalToast, portalToastError } from "@/lib/shared/portal-toast";
import {
  HANDWERKER_ABLEHNUNG_GRUND_LABELS,
  HANDWERKER_ABLEHNUNG_GRUND_VALUES,
} from "@/lib/partner/handwerker-ablehnung";
import {
  buildNachreichungKonditionZeilen,
  konditionZeilenNurAusHw,
  mapKonditionZeilenVereinbart,
  positionBrauchtVorgangAktion,
  resolveNachreichungOpenZeilenIds,
} from "@/lib/partner/partner-konditionen";
import { buildPartnerAuftragKonditionZeilen } from "@/lib/partner/partner-leistungen-display";
import { isPartnerBauprojektAuftrag } from "@/lib/partner/compliance-summary";
import { sortPartnerDokumentZeilen } from "@/lib/partner/partner-auftrag-dokumente";
import {
  partnerOffenStatusLabel,
  partnerOffenStatusPillKey,
} from "@/lib/partner/partner-offen-status";
import {
  vorgangStateLabel,
  vorgangStatePillKey,
  type VorgangState,
} from "@/lib/partner/vorgang-state";
import {
  PARTNER_LEISTUNGEN_GESAMT_LABEL,
  PARTNER_LEISTUNGEN_SECTION_TITLE,
  partnerDetailOrtMetaLine,
  resolvePartnerKonditionZeilen,
} from "@/lib/partner/partner-portal-display";

export function PartnerOffenDetail({
  item,
  vorgangState,
  onConfirmed,
  onBack,
  focusAblehnen,
}: {
  item: PartnerOffenAngebotItem;
  vorgangState?: VorgangState;
  onConfirmed?: (anfrageId: string, opts?: { declined?: boolean }) => void;
  onBack?: () => void;
  focusAblehnen?: boolean;
}) {
  const router = useRouter();
  const { refresh } = usePortalRefresh();
  const { runBusy } = usePortalBusy();
  const isNachreichung = item.offen_karten_typ === "nachreichung";
  const [projektvertragBereit, setProjektvertragBereit] = useState(
    Boolean(item.projektvertrag_bestaetigt_am)
  );
  const [pflichtenGelesen, setPflichtenGelesen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showReject, setShowReject] = useState(Boolean(focusAblehnen));
  const [confirmReject, setConfirmReject] = useState(false);
  const [grund, setGrund] = useState<string>(HANDWERKER_ABLEHNUNG_GRUND_VALUES[0]);
  const [notiz, setNotiz] = useState("");
  const [showKalkulation, setShowKalkulation] = useState(false);
  const [firmendatenFehlenOpen, setFirmendatenFehlenOpen] = useState(false);
  const [firmendatenMissing, setFirmendatenMissing] = useState<string[]>([]);
  const hatAuftrag = Boolean(item.auftrag_id);
  const istBauprojekt = isPartnerBauprojektAuftrag({
    ist_bauprojekt: item.ist_bauprojekt,
    compliance_projekt: item.compliance_projekt,
  });
  const brauchtProjektvertrag = hatAuftrag && !isNachreichung && istBauprojekt;

  useEffect(() => {
    if (focusAblehnen) setShowReject(true);
  }, [focusAblehnen]);

  const statusLabel = vorgangState
    ? vorgangStateLabel(vorgangState)
    : partnerOffenStatusLabel(item.offen_karten_typ);
  const statusPillKey = vorgangState
    ? vorgangStatePillKey(vorgangState)
    : partnerOffenStatusPillKey(item.offen_karten_typ);

  const openPositionIds = useMemo(() => {
    if (!isNachreichung) return null;
    if (item.nachreichung_open_position_ids?.length) {
      return item.nachreichung_open_position_ids;
    }
    return resolveNachreichungOpenZeilenIds({
      crm_positionen_raw: item.crm_positionen_raw,
      crm_auftrag_positionen: item.crm_auftrag_positionen,
      filter: {
        gewerkId: item.gewerk_id,
        handwerkerId: item.handwerker_id,
        gewerkName: item.gewerk_name,
      },
      hw_konditionen: item.hw_konditionen,
      hw_status: item.hw_status,
      alle_hw_konditionen: item.alle_hw_konditionen,
    });
  }, [isNachreichung, item]);

  const konditionZeilen = useMemo(() => {
    if (isNachreichung && openPositionIds?.length) {
      const openSet = new Set(openPositionIds);

      const ausAuftrag = (item.crm_auftrag_positionen ?? []).filter((p) =>
        openSet.has(p.id)
      );
      if (ausAuftrag.length) {
        return buildPartnerAuftragKonditionZeilen(ausAuftrag).map((z) => ({
          ...z,
          zeilenBadge: z.zeilenBadge ?? "neu",
        }));
      }

      const ausCrm = buildNachreichungKonditionZeilen(
        item.crm_positionen_raw,
        item.crm_auftrag_positionen,
        {
          gewerkId: item.gewerk_id,
          handwerkerId: item.handwerker_id,
          gewerkName: item.gewerk_name,
        }
      ).filter((z) => openSet.has(z.id));
      if (ausCrm.length) {
        return ausCrm.map((z) => ({
          ...z,
          zeilenBadge: z.zeilenBadge ?? "neu",
        }));
      }

      const offenAusDb = (item.crm_auftrag_positionen ?? []).filter((p) =>
        positionBrauchtVorgangAktion(p)
      );
      if (offenAusDb.length) {
        return buildPartnerAuftragKonditionZeilen(offenAusDb).map((z) => ({
          ...z,
          zeilenBadge: z.zeilenBadge ?? "neu",
        }));
      }
    }

    if (item.hw_konditionen?.positionen.length) {
      return mapKonditionZeilenVereinbart(konditionZeilenNurAusHw(item.hw_konditionen));
    }

    const zeilen = resolvePartnerKonditionZeilen(
      item.crm_positionen_raw,
      { gewerkId: item.gewerk_id, handwerkerId: item.handwerker_id },
      item.hw_konditionen
    );
    return mapKonditionZeilenVereinbart(zeilen);
  }, [isNachreichung, item, openPositionIds]);

  const dokumentZeilen = useMemo((): DokumentZeile[] => {
    const rows: DokumentZeile[] = [];
    const pv = item.projektvertrag;
    const pvHref = pv?.pdf_signed_url?.trim() || pv?.pdf_url?.trim();
    if (brauchtProjektvertrag && pvHref) {
      rows.push({
        id: "projektvertrag",
        datum: pv?.signiert_am ?? null,
        name: pv?.vertrags_nr
          ? `Projektvertrag ${pv.vertrags_nr}`
          : "Projektvertrag (Leistungsvertrag)",
        href: pvHref,
      });
    }
    return sortPartnerDokumentZeilen(rows);
  }, [item.projektvertrag, brauchtProjektvertrag]);

  const heroMeta = partnerDetailOrtMetaLine(item.lead);

  const meldeFotos = useMemo(() => {
    const fd = item.lead?.funnel_daten as { fotos?: unknown } | null | undefined;
    if (!Array.isArray(fd?.fotos)) return [] as string[];
    return fd.fotos
      .filter(
        (u): u is string => typeof u === "string" && /^https?:\/\//i.test(u)
      )
      .slice(0, 12);
  }, [item.lead?.funnel_daten]);

  const aufgabeOderCrmNotiz =
    item.aufgabe_notiz?.trim() || item.hw_crm_notiz?.trim() || null;

  const primaryLabel = isNachreichung ? "Änderungen bestätigen" : "Annehmen";

  async function onConfirm() {
    setLoading(true);
    setError(null);
    let acceptedForAuto = false;
    try {
      await runBusy(async () => {
        const gelesen = isNachreichung
          ? pflichtenGelesen
          : brauchtProjektvertrag
            ? pflichtenGelesen && projektvertragBereit
            : pflichtenGelesen;
        const verbindlich = gelesen;
        const syntheticAuftragId = item.id.startsWith("auftrag:")
          ? item.id.slice("auftrag:".length)
          : null;
        const auftragId = (item.auftrag_id ?? syntheticAuftragId)?.trim() || null;
        const anfrageId = syntheticAuftragId ? "" : item.id.trim();

        const res =
          anfrageId && !syntheticAuftragId
            ? await confirmPartnerAuftrag({
                anfrageId,
                gelesen,
                verbindlich,
              })
            : auftragId
              ? await confirmPartnerAuftragZuweisung({
                  auftragId,
                  gelesen,
                  verbindlich,
                })
              : {
                  ok: false as const,
                  error: "Vorgang nicht gefunden.",
                };
        setConfirmOpen(false);
        if (!res.ok) {
          setError(res.error);
          portalToastError("Annahme fehlgeschlagen", res.error);
          return;
        }
        if (isNachreichung) {
          partnerPortalToast.aenderungenBestaetigt();
          if (onConfirmed) onConfirmed(item.id);
          else await refresh();
          return;
        }
        if (hatAuftrag) {
          partnerPortalToast.auftragAngenommen();
        } else {
          partnerPortalToast.zuweisungAngenommen();
        }
        // UI sofort weiter — Auto-Angebot läuft danach best-effort.
        acceptedForAuto = true;
        setShowKalkulation(true);
      });

      if (acceptedForAuto) {
        void tryCreatePartnerAutoAngebot(item.id).then((auto) => {
          if (auto.status === "created" || auto.status === "already") {
            partnerPortalToast.unterlagenHochgeladen();
            return;
          }
          if (auto.status === "firmendaten_missing") {
            setFirmendatenMissing(auto.missing);
            setFirmendatenFehlenOpen(true);
            return;
          }
          if (auto.status === "skipped" && auto.error) {
            portalToastError("Angebot nicht automatisch erstellt", auto.error);
          }
        });
      }
    } catch (e) {
      const msg =
        e instanceof Error && e.message.trim()
          ? e.message
          : "Annahme fehlgeschlagen. Bitte erneut versuchen.";
      setError(msg);
      portalToastError("Annahme fehlgeschlagen", msg);
    } finally {
      setLoading(false);
    }
  }

  function continueAfterFirmendatenHinweis() {
    setFirmendatenFehlenOpen(false);
    setShowKalkulation(true);
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
        if (onConfirmed) onConfirmed(item.id, { declined: true });
        else await refresh();
      });
    } finally {
      setLoading(false);
    }
  }

  const kannBestaetigen = isNachreichung
    ? pflichtenGelesen
    : brauchtProjektvertrag
      ? pflichtenGelesen && projektvertragBereit
      : pflichtenGelesen;

  const acceptDisabledHint = !kannBestaetigen
    ? !pflichtenGelesen
      ? "Bitte die Pflichten bestätigen."
      : brauchtProjektvertrag && !projektvertragBereit
        ? "Bitte den Projektvertrag bestätigen."
        : null
    : null;

  const actionFooter =
    showKalkulation ? null : !showReject ? (
      <PortalDetailStickyActions
        primaryLabel={primaryLabel}
        onPrimary={() => setConfirmOpen(true)}
        primaryLoading={loading}
        primaryDisabled={!kannBestaetigen}
        disabledHint={acceptDisabledHint}
        secondaryLabel="Ablehnen"
        onSecondary={() => setShowReject(true)}
        secondaryDisabled={loading}
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

  function finishAfterKalk() {
    if (onConfirmed) onConfirmed(item.id);
    else void refresh();
  }

  if (showKalkulation) {
    return (
      <PortalDetailLayout footer={null}>
        <PortalEntityDetailLayout
          onBack={onBack ?? (() => router.back())}
          backLabel="← Zurück"
          title={resolvePartnerDetailTitelFromAnfrage(item)}
          metaLine={heroMeta}
          statusLabel="Angenommen"
          statusPillClass={partnerDetailStatusPillClass("angenommen")}
          statusPillStyle={partnerDetailStatusPillStyle("angenommen")}
        >
          <div className="space-y-5">
            <PortalDetailInfoBox>
              Als Nächstes: Kalkulation einreichen — Positionen und Summe erscheinen
              bei Bärenwald und der Verwaltung als empfohlenes Angebot.
            </PortalDetailInfoBox>
            <PartnerHwKalkulationScreen
              anfrageId={item.id}
              onDone={finishAfterKalk}
              onCancel={finishAfterKalk}
            />
          </div>
        </PortalEntityDetailLayout>
      </PortalDetailLayout>
    );
  }

  return (
    <PortalDetailLayout footer={actionFooter}>
      <PortalEntityDetailLayout
        coverUrl={item.lead?.objekt?.cover_url}
        onBack={onBack ?? (() => router.back())}
        backLabel="← Zurück"
        title={resolvePartnerDetailTitelFromAnfrage(item)}
        metaLine={heroMeta}
        statusLabel={statusLabel}
        statusPillClass={partnerDetailStatusPillClass(statusPillKey)}
        statusPillStyle={partnerDetailStatusPillStyle(statusPillKey)}
      >
        <div className="space-y-5">
      {aufgabeOderCrmNotiz ? (
        <PortalDetailInfoBox>
          <p className="font-semibold">Hinweis vom Auftraggeber</p>
          <p className="mt-1 whitespace-pre-wrap">{aufgabeOderCrmNotiz}</p>
        </PortalDetailInfoBox>
      ) : null}

      <VorgangDetailBlocks
        vm={buildPartnerVorgangDetailVm({
          idLabel: item.id.slice(0, 8).toUpperCase(),
          titel: resolvePartnerDetailTitelFromAnfrage(item),
          statusLabel,
          lead: item.lead,
          plz: item.plz,
          ort: item.ort,
          zeitraum: item.zeitraum,
          gewerkName: item.gewerk_name,
          aufgabeNotiz: item.aufgabe_notiz ?? item.hw_crm_notiz,
          konditionZeilen,
          fotos: meldeFotos,
        })}
      />

      {isNachreichung && konditionZeilen.length === 0 ? (
        <PortalDetailInfoBox>
          Bärenwald hat Leistungen an diesem Auftrag angepasst. Die Details konnten
          gerade nicht geladen werden — bitte Seite neu laden. Bei anhaltendem
          Problem melde dich bei Bärenwald.
        </PortalDetailInfoBox>
      ) : null}

      {konditionZeilen.length > 0 ? (
        <PortalDetailSection
          title={
            isNachreichung ? "Geänderte Leistungen" : PARTNER_LEISTUNGEN_SECTION_TITLE
          }
        >
          <PartnerLeistungenKonditionenCard
            zeilen={konditionZeilen}
            mode="readonly"
            gesamtLabel={PARTNER_LEISTUNGEN_GESAMT_LABEL}
          />
        </PortalDetailSection>
      ) : null}

      {brauchtProjektvertrag ? (
        <PartnerProjektvertragPaket
          auftragId={item.auftrag_id!}
          gewerkName={item.gewerk_name}
          vertrag={item.projektvertrag ?? null}
          projektvertrag_bestaetigt_am={item.projektvertrag_bestaetigt_am}
          embedded
          onEmbeddedReadyChange={setProjektvertragBereit}
        />
      ) : null}

      <DokumenteTabelle
        dokumente={dokumentZeilen}
        heading="Dokumente"
        emptyText="Noch keine Dokumente."
      />

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

      {!showReject ? (
        <PartnerPflichtenCard
          compliance_stamm={item.compliance_stamm}
          compliance_projekt={item.compliance_projekt}
          compliance_bauauftrag={item.compliance_bauauftrag}
          ist_bauprojekt={item.ist_bauprojekt}
          auftragId={item.auftrag_id}
          includeProjektvertrag={brauchtProjektvertrag}
          acknowledgment={{
            checked: pflichtenGelesen,
            onChange: setPflichtenGelesen,
          }}
        />
      ) : null}

      <PortalConfirmDialog
        open={confirmOpen}
        title={primaryLabel}
        description={
          isNachreichung
            ? "Mit der Bestätigung nimmst du die geänderten Leistungen verbindlich an (stille Aktualisierung — kein neuer Projektvertrag)."
            : brauchtProjektvertrag
              ? "Mit der Bestätigung nimmst du den Auftrag inkl. Projektvertrag verbindlich an."
              : hatAuftrag
                ? "Mit der Bestätigung nimmst du Leistungen und Konditionen verbindlich an."
                : "Mit der Bestätigung nimmst du die Zuweisung verbindlich an."
        }
        confirmLabel={primaryLabel}
        onConfirm={onConfirm}
        onCancel={() => setConfirmOpen(false)}
        loading={loading}
      />

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

      <PartnerFirmendatenFehlenDialog
        open={firmendatenFehlenOpen}
        missing={firmendatenMissing}
        onDismiss={continueAfterFirmendatenHinweis}
        onGoSettings={() => {
          setFirmendatenFehlenOpen(false);
          void refresh();
        }}
      />
        </div>
      </PortalEntityDetailLayout>
    </PortalDetailLayout>
  );
}
