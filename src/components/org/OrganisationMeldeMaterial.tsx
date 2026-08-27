"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { OrganisationMeldeQrModal } from "@/components/org/OrganisationMeldeQrModal";
import {
  copyMeldeLink,
  openMeldeAushangPdf,
} from "@/lib/org/melde-aushang-ui";
import {
  orgMeldeLegalUrlsReady,
  ORG_MELDE_LEGAL_REQUIRED_HINT,
} from "@/lib/org/melde-legal-urls";
import { buildMeldeUrl } from "@/lib/org/melde-url";
import type { OrganisationKunde } from "@/lib/org/types";
import { EinstellungenSectionHeader } from "@/components/shared/PortalEinstellungenUi";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { cn } from "@/lib/utils";

type Props = {
  kunde: OrganisationKunde;
  /** @deprecated — immer flach wie Partner-Einstellungen */
  nested?: boolean;
};

export function OrganisationMeldeMaterial({ kunde }: Props) {
  const orgKennung = kunde.org_kennung?.trim() ?? "";
  const legalReady = orgMeldeLegalUrlsReady(kunde);
  const meldeUrl =
    legalReady && orgKennung
      ? buildMeldeUrl(orgKennung, undefined, { forPrint: true })
      : "";
  const actionsEnabled = Boolean(legalReady && orgKennung && meldeUrl);
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  async function copyLink() {
    if (!actionsEnabled || !meldeUrl) return;
    const ok = await copyMeldeLink(meldeUrl);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="space-y-3">
      <EinstellungenSectionHeader title="Schadensmeldung für Mieter" />

      {!legalReady ? (
        <p className="text-[13px] leading-[1.55]" style={{ color: PORTAL_VAR.sub }}>
          {ORG_MELDE_LEGAL_REQUIRED_HINT}
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <span className="text-[11.5px] font-bold tracking-wide text-text-tertiary">
              Melde-Link
            </span>
            <div
              className={cn(
                "flex items-center gap-2 rounded-[9px] border border-border-default px-3 py-2",
                actionsEnabled ? "bg-[#f3f4f3]" : "bg-[#f3f4f3] opacity-55"
              )}
            >
              <p className="min-w-0 flex-1 break-all text-[13.5px] font-semibold text-text-primary">
                {meldeUrl || "Wird vorbereitet…"}
              </p>
              <button
                type="button"
                disabled={!actionsEnabled}
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-text-secondary transition-colors",
                  actionsEnabled && "hover:bg-white hover:text-accent",
                  copied && "text-accent",
                  !actionsEnabled && "cursor-not-allowed opacity-50"
                )}
                onClick={() => void copyLink()}
                aria-label={copied ? "Kopiert" : "Link kopieren"}
                title={copied ? "Kopiert" : "Link kopieren"}
              >
                {copied ? (
                  <Check className="h-4 w-4" strokeWidth={2.25} />
                ) : (
                  <Copy className="h-4 w-4" strokeWidth={2.25} />
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!actionsEnabled}
              className="btn-pill-primary !py-2 disabled:cursor-not-allowed disabled:opacity-45"
              onClick={() => openMeldeAushangPdf()}
            >
              Aushang PDF
            </button>
            <button
              type="button"
              disabled={!actionsEnabled}
              className="btn-pill-outline !py-2 disabled:cursor-not-allowed disabled:opacity-45"
              onClick={() => setQrOpen(true)}
            >
              QR-Code
            </button>
          </div>
        </>
      )}

      {qrOpen && actionsEnabled ? (
        <OrganisationMeldeQrModal
          open
          onClose={() => setQrOpen(false)}
          label={kunde.org_anzeigename?.trim() || kunde.name || "Melde-Link"}
        />
      ) : null}
    </div>
  );
}
