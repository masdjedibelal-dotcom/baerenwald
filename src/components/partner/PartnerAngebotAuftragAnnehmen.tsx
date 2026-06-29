"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { confirmPartnerProjektvertrag } from "@/app/actions/partner-vertrag";
import { PartnerPflichtenCard } from "@/components/partner/PartnerPflichtenCard";
import {
  PartnerConfirmDialog,
  PartnerDetailError,
} from "@/components/partner/PartnerDetailUi";
import { partnerPortalToast } from "@/lib/shared/portal-toast";
import type { PartnerAnfrageItem } from "@/lib/partner/get-partner-data";

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

  const auftragId = item.auftrag_id?.trim();
  if (!auftragId) return null;

  const kannBestaetigen = gelesen && verbindlich;

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
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={gelesen}
              onChange={(e) => setGelesen(e.target.checked)}
              className="mt-1"
            />
            <span className="portal-text-body text-text-primary">
              Ich habe den Projekt-Nachunternehmervertrag gelesen.
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
        <button
          type="button"
          disabled={!kannBestaetigen || loading}
          onClick={() => setConfirmOpen(true)}
          className="btn-pill-primary portal-btn w-full !py-3"
        >
          {loading ? "Wird gesendet…" : "Auftrag annehmen"}
        </button>
        <PartnerConfirmDialog
          open={confirmOpen}
          title="Auftrag annehmen?"
          description="Danach unter Aufträge."
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
