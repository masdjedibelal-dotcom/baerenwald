"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { confirmPartnerProjektvertrag } from "@/app/actions/partner-vertrag";
import {
  PartnerConfirmDialog,
  PartnerDetailError,
  PartnerDetailInfoBox,
  PartnerDetailKeyValues,
  PartnerDetailSection,
  PartnerDetailSuccessBox,
} from "@/components/partner/PartnerDetailUi";
import { PartnerComplianceCheckliste } from "@/components/partner/PartnerComplianceCheckliste";
import {
  type PartnerComplianceItem,
  type PartnerProjektvertrag,
} from "@/lib/partner/partner-compliance";
import { fmtPartnerDate } from "@/lib/partner/partner-detail-format";

export function PartnerProjektvertragPaket({
  auftragId,
  gewerkName,
  vertrag,
  complianceAllgemein,
  complianceMeister,
  complianceLeistung,
  complianceStamm,
  complianceProjekt,
  projektvertrag_bestaetigt_am,
  variant = "angebot",
}: {
  auftragId: string;
  gewerkName?: string;
  vertrag: PartnerProjektvertrag | null;
  complianceAllgemein?: PartnerComplianceItem[];
  complianceMeister?: PartnerComplianceItem[];
  complianceLeistung?: PartnerComplianceItem[];
  complianceStamm: PartnerComplianceItem[];
  complianceProjekt: PartnerComplianceItem[];
  projektvertrag_bestaetigt_am?: string | null;
  variant?: "angebot" | "auftrag";
}) {
  const router = useRouter();
  const [gelesen, setGelesen] = useState(false);
  const [verbindlich, setVerbindlich] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const bestaetigt = Boolean(projektvertrag_bestaetigt_am);
  const allgemein = complianceAllgemein ?? complianceStamm.filter((i) => i.ebene === "allgemein");
  const meister = complianceMeister ?? complianceStamm.filter((i) => i.ebene === "meister");
  const leistung = complianceLeistung ?? complianceProjekt;
  const stammUnterlagen = [...allgemein, ...meister];

  const kannBestaetigen = !bestaetigt && vertrag && gelesen && verbindlich;

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
    router.refresh();
  }

  if (bestaetigt) {
    return (
      <PartnerDetailSuccessBox>
        <p className="font-semibold">Auftrag verbindlich bestätigt</p>
        <p className="text-sm">
          Projektvertrag bestätigt am {fmtPartnerDate(projektvertrag_bestaetigt_am)}.
          {variant === "angebot"
            ? " Der Auftrag erscheint unter „Aufträge“, sobald Bärenwald die Freigabe abgeschlossen hat."
            : " Du findest den Vertrag unter Dokumente."}
        </p>
        {vertrag?.pdf_signed_url || vertrag?.pdf_url ? (
          <a
            href={vertrag.pdf_signed_url ?? vertrag.pdf_url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block font-medium text-emerald-800 underline-offset-2 hover:underline"
          >
            Projektvertrag öffnen
          </a>
        ) : null}
      </PartnerDetailSuccessBox>
    );
  }

  if (!vertrag) {
    return (
      <PartnerDetailInfoBox>
        Bärenwald bereitet deinen Projektvertrag vor. Sobald dein Angebot geprüft und der Kunde
        bestätigt hat, erhältst du hier den Vertrag zur verbindlichen Annahme.
      </PartnerDetailInfoBox>
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
        Bitte lies den Projekt-Nachunternehmervertrag und bestätige den Auftrag verbindlich.
        {variant === "angebot"
          ? " Erst danach wird das Projekt unter „Aufträge“ freigeschaltet."
          : ""}
      </PartnerDetailInfoBox>

      <PartnerDetailSection title="Projektvertrag">
        <PartnerDetailKeyValues rows={vertragRows} />
        {vertrag.pdf_signed_url || vertrag.pdf_url ? (
          <a
            href={vertrag.pdf_signed_url ?? vertrag.pdf_url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-pill-outline portal-btn mt-3 inline-flex !px-4 !py-2.5"
          >
            Vertrag als PDF öffnen
          </a>
        ) : null}
      </PartnerDetailSection>

      {variant !== "angebot" ? (
        <>
          <PartnerComplianceCheckliste
            title="Unterlagen"
            items={stammUnterlagen}
            disabled={bestaetigt}
          />

          <PartnerComplianceCheckliste
            title="Leistungsvertrag & Auftrag"
            items={leistung}
            auftragId={auftragId}
            disabled={bestaetigt}
          />
        </>
      ) : null}

      {!bestaetigt ? (
        <div className="space-y-3 rounded-xl border border-border-light bg-muted/20 p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={gelesen}
              onChange={(e) => setGelesen(e.target.checked)}
              className="mt-1"
            />
            <span className="portal-text-body text-text-primary">
              Ich habe den Projekt-Nachunternehmervertrag gelesen
              {vertrag.pdf_signed_url || vertrag.pdf_url ? " und heruntergeladen" : ""}.
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
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

      {variant === "angebot" && !bestaetigt && (!gelesen || !verbindlich) ? (
        <p className="portal-text-meta text-text-secondary">
          Bitte beide Bestätigungen ankreuzen, um den Auftrag verbindlich anzunehmen.
        </p>
      ) : null}

      {variant === "angebot" && kannBestaetigen ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => setConfirmOpen(true)}
          className="btn-pill-primary portal-btn w-full !py-3 sm:w-auto sm:!px-6"
        >
          {loading ? "Wird gesendet…" : "Auftrag verbindlich bestätigen"}
        </button>
      ) : null}

      <PartnerConfirmDialog
        open={confirmOpen}
        title="Auftrag verbindlich bestätigen?"
        description="Du schließt den Projekt-Nachunternehmervertrag ab. Bärenwald wird informiert. Der Auftrag wird danach unter „Aufträge“ freigeschaltet."
        confirmLabel="Ja, verbindlich bestätigen"
        loading={loading}
        onConfirm={onConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
