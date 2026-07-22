"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import {
  copyMeldeLink,
  openMeldeAushangPdf,
} from "@/lib/org/melde-aushang-ui";
import { buildMeldeUrl } from "@/lib/org/melde-url";
import type { OrganisationKunde } from "@/lib/org/types";
import { EinstellungenCard } from "@/components/shared/PortalEinstellungenUi";
import { PORTAL_C } from "@/lib/portal2/tokens";
import { cn } from "@/lib/utils";

type Props = {
  kunde: OrganisationKunde;
  objektCount?: number;
  nested?: boolean;
};

export function OrganisationMeldeMaterial({
  kunde,
  objektCount = 0,
  nested = false,
}: Props) {
  const orgKennung = kunde.org_kennung?.trim() ?? "";
  // Öffentlicher Mieter-Link immer Produktions-Domain (nicht Preview/localhost)
  const meldeUrl = orgKennung
    ? buildMeldeUrl(orgKennung, undefined, { forPrint: true })
    : "";
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    if (!meldeUrl) return;
    const ok = await copyMeldeLink(meldeUrl);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  if (!orgKennung) {
    const missing = (
      <>
        <p className="text-[13.5px] font-semibold text-text-primary">
          Melde-Link noch nicht verfügbar
        </p>
        <p className="mt-1 text-[13px] leading-[1.55]" style={{ color: PORTAL_C.sub }}>
          Die Organisations-Kennung fehlt. Bitte Bärenwald kontaktieren — danach
          können Sie den Link kopieren und den Aushang als PDF öffnen.
        </p>
      </>
    );
    return nested ? (
      <EinstellungenCard title="Schadensmeldung für Mieter">{missing}</EinstellungenCard>
    ) : (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">Melde-Link noch nicht verfügbar</p>
        <p className="mt-1 text-amber-800">
          Die Organisations-Kennung fehlt. Bitte Bärenwald kontaktieren.
        </p>
      </div>
    );
  }

  const body = (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] leading-[1.55]" style={{ color: PORTAL_C.sub }}>
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
      </div>
    </div>
  );

  if (nested) {
    return (
      <EinstellungenCard title="Schadensmeldung für Mieter">{body}</EinstellungenCard>
    );
  }

  return (
    <section className="portal-surface space-y-4 p-4 sm:p-5">
      <div>
        <h3 className="font-semibold text-text-primary">Schadensmeldung für Mieter</h3>
      </div>
      {body}
    </section>
  );
}
