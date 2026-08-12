"use client";

import { useState } from "react";

import { PortalModalShell } from "@/components/shared/PortalModalShell";
import {
  SOFORTMASSNAHME_FAELLE_FOOTNOTE,
  SOFORTMASSNAHME_FAELLE_GRUPPEN,
  SOFORTMASSNAHME_FAELLE_INTRO,
  SOFORTMASSNAHME_FAELLE_POPUP_TITLE,
} from "@/lib/org/sofortmassnahme-faelle";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/**
 * Linktext „Fälle“ → Popup mit Kurzbullets aus dem Melde-Funnel.
 * Nur Einstellungen (Freigabe / Sofortmaßnahme).
 */
export function SofortmassnahmeFaelleLink({ className }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={cn(
          "portal-text-label inline font-semibold normal-case tracking-normal underline-offset-2 hover:underline",
          className
        )}
        style={{ color: PORTAL_VAR.primary }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {SOFORTMASSNAHME_FAELLE_POPUP_TITLE}
      </button>

      <PortalModalShell
        open={open}
        title={SOFORTMASSNAHME_FAELLE_POPUP_TITLE}
        onClose={() => setOpen(false)}
        variant="confirm"
      >
        <div className="space-y-4">
          <p className="portal-text-body text-text-secondary">
            {SOFORTMASSNAHME_FAELLE_INTRO}
          </p>
          <div className="space-y-3.5">
            {SOFORTMASSNAHME_FAELLE_GRUPPEN.map((g) => (
              <div key={g.bereich}>
                <p className="portal-text-card-title font-semibold">
                  {g.bereich}
                </p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  {g.bullets.map((b) => (
                    <li key={b} className="portal-text-body text-text-secondary">
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="portal-text-meta text-text-tertiary">
            {SOFORTMASSNAHME_FAELLE_FOOTNOTE}
          </p>
        </div>
      </PortalModalShell>
    </>
  );
}

/** Titel + Link „Fälle“ in einer Zeile. */
export function SofortmassnahmeAkutTitleWithFaelle({
  className,
}: {
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5",
        className
      )}
    >
      <span>Direktbeauftragung bei Sofortmaßnahme</span>
      <SofortmassnahmeFaelleLink />
    </span>
  );
}
