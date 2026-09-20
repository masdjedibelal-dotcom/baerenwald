"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PortalCheckbox } from "@/components/shared/PortalFormControls";
import { confirmPartnerProjektvertrag } from "@/app/actions/partner-vertrag";
import {
  PartnerConfirmDialog,
  PartnerDetailError,
  PartnerDetailInfoBox,
  PartnerDetailKeyValues,
  PartnerDetailSuccessBox,
} from "@/components/partner/PartnerDetailUi";
import { PortalDetailCard } from "@/components/shared/PortalDetailCard";
import { PortalButton } from "@/components/portal/PortalButton";
import { PortalDocOpenButton } from "@/components/shared/PortalDocOpenButton";
import {
  type PartnerProjektvertrag,
} from "@/lib/partner/partner-compliance";
import { partnerPortalToast } from "@/lib/shared/portal-toast";
import { fmtPartnerDate } from "@/lib/partner/partner-detail-format";
import { cn } from "@/lib/utils";

export function PartnerProjektvertragPaket({
  auftragId,
  gewerkName,
  vertrag,
  projektvertrag_bestaetigt_am,
  embedded = false,
  onEmbeddedReadyChange,
  highlight = false,
}: {
  auftragId: string;
  gewerkName?: string;
  vertrag: PartnerProjektvertrag | null;
  projektvertrag_bestaetigt_am?: string | null;
  /** Ohne eigenen Bestätigen-Button — Parent steuert Annahme (z. B. Tab Offen). */
  embedded?: boolean;
  onEmbeddedReadyChange?: (ready: boolean) => void;
  /** Parent: Annehmen geklickt ohne Pflicht-Checkbox → Markierung. */
  highlight?: boolean;
}) {
  const router = useRouter();
  const [gelesen, setGelesen] = useState(false);
  const [verbindlich, setVerbindlich] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const bestaetigt = Boolean(projektvertrag_bestaetigt_am);
  const kannBestaetigen = !bestaetigt && vertrag && gelesen && verbindlich;

  useEffect(() => {
    if (!embedded || !onEmbeddedReadyChange) return;
    if (bestaetigt || !vertrag) {
      onEmbeddedReadyChange(true);
      return;
    }
    onEmbeddedReadyChange(gelesen && verbindlich);
  }, [embedded, onEmbeddedReadyChange, bestaetigt, vertrag, gelesen, verbindlich]);

  async function onConfirm() {
    setLoading(true);
    setError(null);
    const res = await confirmPartnerProjektvertrag({
      auftragId,
      gelesen,
      verbindlich,
    });
    setLoading(false);
    setConfirmOpen(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    partnerPortalToast.projektvertragBestaetigt();
    router.refresh();
  }

  if (bestaetigt) {
    return (
      <PartnerDetailSuccessBox>
        <p className="font-semibold">Auftrag verbindlich bestätigt</p>
        <p className="text-sm">
          Projektvertrag bestätigt am {fmtPartnerDate(projektvertrag_bestaetigt_am)}. Der Auftrag
          erscheint unter „Aufträge“ — dort können Sie fehlende Unterlagen zum Bauauftrag
          hochladen.
        </p>
        {vertrag?.pdf_signed_url || vertrag?.pdf_url ? (
          <PortalDocOpenButton
            href={vertrag.pdf_signed_url ?? vertrag.pdf_url ?? "#"}
            name="Projektvertrag"
            kind="pdf"
            className="mt-2 inline-block font-medium text-p2-primary underline-offset-2 hover:underline"
          >
            Projektvertrag öffnen
          </PortalDocOpenButton>
        ) : null}
      </PartnerDetailSuccessBox>
    );
  }

  if (!vertrag) {
    return (
      <PortalDetailCard title="Projektvertrag (Leistungsvertrag)" id="partner-pflichten-ack">
        <PartnerDetailInfoBox>
          Bärenwald bereitet Ihren Projektvertrag für diesen Auftrag vor. Er erscheint hier,
          sobald er bei Bärenwald freigegeben ist — ein Vertrag pro Auftrag, unabhängig vom Gewerk.
        </PartnerDetailInfoBox>
      </PortalDetailCard>
    );
  }

  const vertragRows = [
    { label: "Projekt", value: vertrag.auftrag_titel },
    { label: "Gewerk", value: vertrag.gewerk_name ?? gewerkName },
    { label: "Bauvorhaben", value: vertrag.bauvorhaben },
    { label: "Leistungsumfang", value: vertrag.leistungsumfang },
    { label: "Vergütung", value: vertrag.verguetung_text },
    { label: "Vertragsnummer", value: vertrag.vertrags_nr },
  ];

  return (
    <div className="space-y-5">
      <PartnerDetailInfoBox>
        Bitte lies den Projekt-Nachunternehmervertrag und bestätige den Auftrag verbindlich. Erst
        danach wird das Projekt unter „Aufträge“ freigeschaltet. Unterlagen zum Bauauftrag sind
        optional — Sie können sie dort jederzeit hochladen, auch wenn Sie sie hier noch nicht
        einreichst.
      </PartnerDetailInfoBox>

      <PortalDetailCard title="Projektvertrag (Leistungsvertrag)">
        <PartnerDetailKeyValues rows={vertragRows} />
        {vertrag.pdf_signed_url || vertrag.pdf_url ? (
          <PortalDocOpenButton
            href={vertrag.pdf_signed_url ?? vertrag.pdf_url ?? "#"}
            name="Projektvertrag"
            kind="pdf"
            className="btn-pill-outline mt-3 inline-flex"
          >
            Vertrag als PDF öffnen
          </PortalDocOpenButton>
        ) : null}
      </PortalDetailCard>

      {!bestaetigt ? (
        <div className="space-y-3 rounded-sheet border border-border-light bg-muted/20 p-4">
          <label
            id={!gelesen ? "partner-pflichten-ack" : undefined}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-field transition-[box-shadow,background-color]",
              highlight && !gelesen && "partner-pflichten-ack--pulse"
            )}
          >
            <PortalCheckbox
              checked={gelesen}
              onChange={(e) => setGelesen(e.target.checked)}
              className="mt-1"
            />
            <span className="portal-text-body text-text-primary">
              Ich habe den Projekt-Nachunternehmervertrag gelesen
              {vertrag.pdf_signed_url || vertrag.pdf_url ? " und heruntergeladen" : ""}.
            </span>
          </label>
          <label
            id={gelesen && !verbindlich ? "partner-pflichten-ack" : undefined}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-field transition-[box-shadow,background-color]",
              highlight && gelesen && !verbindlich && "partner-pflichten-ack--pulse"
            )}
          >
            <PortalCheckbox
              checked={verbindlich}
              onChange={(e) => setVerbindlich(e.target.checked)}
              className="mt-1"
            />
            <span className="portal-text-body text-text-primary">
              Ich nehme diesen Auftrag verbindlich an (Projekt-Nachunternehmervertrag).
            </span>
          </label>
          {error ? <PartnerDetailError message={error} /> : null}
        </div>
      ) : null}

      {!embedded && !bestaetigt && (!gelesen || !verbindlich) ? (
        <p className="portal-text-meta text-text-secondary">
          Bitte beide Bestätigungen ankreuzen, um den Auftrag verbindlich anzunehmen.
        </p>
      ) : null}

      {!embedded && kannBestaetigen ? (
        <PortalButton variant="secondary"
          action={false}
          disabled={loading}
          onClick={() => setConfirmOpen(true)}
          className="btn-pill-primary w-full sm:w-auto"
        >
          {loading ? "Wird gesendet…" : "Auftrag verbindlich bestätigen"}
        </PortalButton>
      ) : null}

      {!embedded ? (
        <PartnerConfirmDialog
          open={confirmOpen}
          title="Auftrag verbindlich bestätigen?"
          description="Sie schließen den Projekt-Nachunternehmervertrag ab. Bärenwald wird informiert. Der Auftrag wird danach unter „Aufträge“ freigeschaltet."
          confirmLabel="Ja, verbindlich bestätigen"
          loading={loading}
          onConfirm={onConfirm}
          onCancel={() => setConfirmOpen(false)}
        />
      ) : null}
    </div>
  );
}
