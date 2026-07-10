"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { acceptPartnerRahmenvertrag } from "@/app/actions/partner-vertrag";
import { PartnerRahmenvertragAcceptBlock } from "@/components/partner/PartnerRahmenvertragAcceptBlock";
import { PartnerStammDokumenteListe } from "@/components/partner/PartnerStammDokumenteListe";
import {
  rahmenvertragBrauchtPortalAkzeptanz,
  rahmenvertragErfuellt,
  type PartnerRahmenvertrag,
} from "@/lib/partner/compliance-summary";
import { partnerPortalToast } from "@/lib/shared/portal-toast";
import type { PartnerComplianceItem } from "@/lib/partner/partner-compliance";

export function PartnerRahmenvertragCard({
  rahmenvertrag,
  stammItems,
  handwerkskarte = [],
}: {
  rahmenvertrag: PartnerRahmenvertrag | null;
  stammItems: PartnerComplianceItem[];
  handwerkskarte?: PartnerComplianceItem[];
}) {
  const router = useRouter();
  const [akzeptiert, setAkzeptiert] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const erfüllt = rahmenvertragErfuellt(stammItems, rahmenvertrag);
  const portalAkzeptiert = Boolean(rahmenvertrag?.portal_akzeptiert_am);
  const akzeptiertAnzeige = portalAkzeptiert || erfüllt;
  const pdfUrl = rahmenvertrag?.pdf_signed_url ?? rahmenvertrag?.pdf_url;
  const brauchtAkzeptanz = rahmenvertragBrauchtPortalAkzeptanz(rahmenvertrag);

  async function onSpeichern() {
    if (!rahmenvertrag) return;
    setLoading(true);
    setError(null);
    const res = await acceptPartnerRahmenvertrag({
      vertragId: rahmenvertrag.id,
      akzeptiert,
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    partnerPortalToast.rahmenvertragAkzeptiert();
    router.refresh();
  }

  const footer =
    brauchtAkzeptanz && rahmenvertrag ? (
      <div className="space-y-3">
        <PartnerRahmenvertragAcceptBlock
          pdfUrl={pdfUrl}
          vertragsNr={rahmenvertrag.vertrags_nr}
          akzeptiert={akzeptiert}
          onAkzeptiertChange={setAkzeptiert}
          error={error}
        />
        <button
          type="button"
          disabled={loading || !akzeptiert}
          onClick={() => void onSpeichern()}
          className="btn-pill-primary portal-btn !px-4 !py-2.5 disabled:opacity-60"
        >
          {loading ? "Wird gespeichert…" : "Annahme speichern"}
        </button>
      </div>
    ) : null;

  return (
    <PartnerStammDokumenteListe
      rahmenvertrag={rahmenvertrag}
      akzeptiert={akzeptiertAnzeige}
      pdfUrl={pdfUrl}
      handwerkskarte={handwerkskarte}
      footer={footer}
    />
  );
}
