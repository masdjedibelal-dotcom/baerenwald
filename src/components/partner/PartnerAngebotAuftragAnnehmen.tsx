"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PortalCheckbox } from "@/components/shared/PortalFormControls";
import { confirmPartnerProjektvertrag } from "@/app/actions/partner-vertrag";
import { PartnerPflichtenCard } from "@/components/partner/PartnerPflichtenCard";
import {
  PartnerConfirmDialog,
  PartnerDetailError,
} from "@/components/partner/PartnerDetailUi";
import { partnerPortalToast } from "@/lib/shared/portal-toast";
import type { PartnerAnfrageItem } from "@/lib/partner/get-partner-data";
import { PortalButton } from "@/components/portal/PortalButton";
import { cn } from "@/lib/utils";

export function PartnerAngebotAuftragAnnehmen({
  item,
  footer = false,
}: {
  item: PartnerAnfrageItem;
  /** Sticky-Footer: nur Checkboxen + Button, Checkliste separat darüber. */
  footer?: boolean;
}) {
  const router = useRouter();
  const [gelesen, setGelesen] = useState(false);
  const [verbindlich, setVerbindlich] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [highlight, setHighlight] = useState(false);

  const auftragId = item.auftrag_id?.trim();
  if (!auftragId) return null;

  const kannBestaetigen = gelesen && verbindlich;

  function focusAck() {
    const el = document.getElementById("partner-pflichten-ack");
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlight(true);
    window.setTimeout(() => setHighlight(false), 2200);
  }

  async function onConfirm() {
    if (!auftragId) return;
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

  if (footer) {
    return (
      <>
        <div className="space-y-3">
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
              Ich habe den Projekt-Nachunternehmervertrag gelesen.
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
        <PortalButton
          variant="secondary"
          action={false}
          disabled={loading}
          onClick={() => {
            if (!kannBestaetigen) {
              focusAck();
              return;
            }
            setConfirmOpen(true);
          }}
          className="btn-pill-primary w-full sm:w-auto"
        >
          {loading ? "Wird gesendet…" : "Auftrag annehmen"}
        </PortalButton>
        <PartnerConfirmDialog
          open={confirmOpen}
          title="Auftrag annehmen?"
          description="Danach unter Vorgänge."
          confirmLabel="Annehmen"
          loading={loading}
          onConfirm={onConfirm}
          onCancel={() => setConfirmOpen(false)}
        />
      </>
    );
  }

  return (
    <PartnerPflichtenCard
      compliance_stamm={item.compliance_stamm}
      compliance_projekt={item.compliance_projekt}
      compliance_bauauftrag={item.compliance_bauauftrag}
      ist_bauprojekt={item.ist_bauprojekt}
      auftragId={auftragId}
    />
  );
}
