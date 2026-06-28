"use client";

import { FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { acceptPartnerRahmenvertrag } from "@/app/actions/partner-vertrag";
import { PartnerRahmenvertragAcceptBlock } from "@/components/partner/PartnerRahmenvertragAcceptBlock";
import { PartnerDetailSection } from "@/components/partner/PartnerDetailUi";
import { PartnerComplianceCheckliste } from "@/components/partner/PartnerComplianceCheckliste";
import {
  rahmenvertragBrauchtPortalAkzeptanz,
  rahmenvertragErfuellt,
  type PartnerRahmenvertrag,
} from "@/lib/partner/compliance-summary";
import type { PartnerComplianceItem } from "@/lib/partner/partner-compliance";
import { fmtPartnerDate } from "@/lib/partner/partner-detail-format";
import { cn } from "@/lib/utils";

function statusLabel(erfüllt: boolean, status: string, portalAkzeptiert: boolean): string {
  if (portalAkzeptiert || erfüllt) return "Akzeptiert";
  if (status === "entwurf") return "In Vorbereitung";
  return "Ausstehend";
}

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
  const status = rahmenvertrag?.status ?? "entwurf";
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
    router.refresh();
  }

  return (
    <PartnerDetailSection title="Rahmenvertrag">
      <div className="space-y-4 rounded-xl border border-border-light bg-surface-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                erfüllt ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
              )}
            >
              <FileText className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="portal-text-body font-semibold text-text-primary">
                Partnerschafts-Rahmenvertrag
              </p>
              <p className="portal-text-meta mt-0.5 text-text-secondary">
                Bei Registrierung akzeptiert — hier einsehbar und als PDF downloadbar.
              </p>
              {rahmenvertrag?.vertrags_nr ? (
                <p className="portal-text-meta mt-1 text-text-tertiary">
                  Nr. {rahmenvertrag.vertrags_nr}
                </p>
              ) : null}
              {rahmenvertrag?.signiert_am ? (
                <p className="portal-text-meta mt-1 text-text-tertiary">
                  Signiert am {fmtPartnerDate(rahmenvertrag.signiert_am)}
                </p>
              ) : null}
              {rahmenvertrag?.portal_akzeptiert_am ? (
                <p className="portal-text-meta mt-1 text-emerald-700">
                  Im Portal akzeptiert am{" "}
                  {fmtPartnerDate(rahmenvertrag.portal_akzeptiert_am)}
                </p>
              ) : null}
            </div>
          </div>
          <span
            className={cn(
              "tag shrink-0",
              erfüllt || portalAkzeptiert ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
            )}
          >
            {statusLabel(erfüllt, status, portalAkzeptiert)}
          </span>
        </div>

        {brauchtAkzeptanz && rahmenvertrag ? (
          <div className="space-y-3 border-t border-border-light pt-4">
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
        ) : pdfUrl ? (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="portal-text-body inline-flex font-medium text-accent underline-offset-2 hover:underline"
          >
            Rahmenvertrag ansehen (PDF)
          </a>
        ) : (
          <p className="portal-text-meta text-text-secondary">
            Sobald dein Rahmenvertrag fertig ist, erscheint er hier zum Download.
          </p>
        )}
      </div>

      {handwerkskarte.length > 0 ? (
        <PartnerComplianceCheckliste
          title="Handwerkskarte"
          items={handwerkskarte}
          emptyText="Keine Handwerkskarte hinterlegt."
        />
      ) : null}
    </PartnerDetailSection>
  );
}
