"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { OrganisationMeldeQrModal } from "@/components/org/OrganisationMeldeQrModal";
import {
  copyMeldeLink,
  openMeldeAushangPdf,
} from "@/lib/org/melde-aushang-ui";
import { buildMeldeUrl } from "@/lib/org/melde-url";
import type { OrganisationKunde } from "@/lib/org/types";
import { EinstellungenSectionHeader } from "@/components/shared/PortalEinstellungenUi";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { cn } from "@/lib/utils";

type Props = {
  kunde: OrganisationKunde;
  objektCount?: number;
  /** @deprecated — immer flach wie Partner-Einstellungen */
  nested?: boolean;
};

export function OrganisationMeldeMaterial({
  kunde,
  objektCount = 0,
}: Props) {
  const orgKennung = kunde.org_kennung?.trim() ?? "";
  const meldeUrl = orgKennung
    ? buildMeldeUrl(orgKennung, undefined, { forPrint: true })
    : "";
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  async function copyLink() {
    if (!meldeUrl) return;
    const ok = await copyMeldeLink(meldeUrl);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  if (!orgKennung) {
    return (
      <div className="space-y-2">
        <EinstellungenSectionHeader title="Schadensmeldung für Mieter" />
        <p className="text-[13.5px] font-semibold text-text-primary">
          Melde-Link noch nicht verfügbar
        </p>
        <p className="text-[13px] leading-[1.55]" style={{ color: PORTAL_VAR.sub }}>
          Die Organisations-Kennung fehlt. Bitte Bärenwald kontaktieren — danach
          können Sie den Link kopieren und den Aushang als PDF öffnen.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <EinstellungenSectionHeader title="Schadensmeldung für Mieter" />
      <p className="text-[13px] leading-[1.55]" style={{ color: PORTAL_VAR.sub }}>
        Ein Link für alle Objekte — Mieter wählen ihr Gebäude im Formular.
        {objektCount === 0
          ? " Legen Sie zuerst unter Objekte mindestens ein Gebäude an."
          : " Objekt-spezifische Aushänge finden Sie im Objekt-Detail."}
      </p>

      <div className="flex flex-col gap-1">
        <span className="text-[11.5px] font-bold tracking-wide text-text-tertiary">
          Melde-Link
        </span>
        <div className="flex items-center gap-2 rounded-[9px] border border-border-default bg-[#f3f4f3] px-3 py-2">
          <p className="min-w-0 flex-1 break-all text-[13.5px] font-semibold text-text-primary">
            {meldeUrl}
          </p>
          <button
            type="button"
            className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-text-secondary transition-colors hover:bg-white hover:text-accent",
              copied && "text-accent"
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
          className="btn-pill-primary !py-2"
          onClick={() => openMeldeAushangPdf()}
        >
          Aushang PDF
        </button>
        <button
          type="button"
          className="rounded-full border border-border-default bg-white px-4 py-2 text-[13px] font-semibold text-text-secondary hover:border-accent hover:text-accent"
          onClick={() => setQrOpen(true)}
        >
          QR-Code
        </button>
      </div>

      {qrOpen ? (
        <OrganisationMeldeQrModal
          open
          onClose={() => setQrOpen(false)}
          label={kunde.org_anzeigename?.trim() || kunde.name || "Melde-Link"}
        />
      ) : null}
    </div>
  );
}
