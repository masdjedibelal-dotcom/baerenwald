"use client";

import { useState } from "react";

import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { OBJ_MIETER_MENU } from "@/lib/portal2/objekte";
import { cn } from "@/lib/utils";

type Props = {
  hasEmail?: boolean;
  onEinladen: () => void;
  onVorgaenge: () => void;
  onEntfernen: () => void;
  onBearbeiten?: () => void;
};

/**
 * Mieter-⋯ — ActionSheet via Shell `confirm`.
 */
export function OrganisationObjektMieterMenu({
  hasEmail,
  onEinladen,
  onVorgaenge,
  onEntfernen,
  onBearbeiten,
}: Props) {
  const [open, setOpen] = useState(false);

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  const item = (label: string, onClick: () => void, danger?: boolean) => (
    <button
      type="button"
      className={cn(
        "block w-full rounded-[10px] px-3.5 py-3 text-left text-[14px] font-semibold",
        danger
          ? "portal-danger hover:bg-[var(--p2-danger-soft)]"
          : "text-text-primary hover:bg-muted"
      )}
      onClick={() => run(onClick)}
    >
      {label}
    </button>
  );

  return (
    <div>
      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-default bg-white text-base text-text-secondary"
        aria-label="Mieter-Menü"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        ⋯
      </button>

      <PortalModalShell
        open={open}
        title="Mieter"
        onClose={() => setOpen(false)}
        variant="confirm"
        maxWidth={360}
      >
        <div className="flex flex-col gap-0.5">
          {item(
            hasEmail ? OBJ_MIETER_MENU.erneut : OBJ_MIETER_MENU.einladen,
            onEinladen
          )}
          {item(OBJ_MIETER_MENU.bearbeiten, () => onBearbeiten?.())}
          {item(OBJ_MIETER_MENU.vorgaenge, onVorgaenge)}
          <div className="my-1.5 border-t border-border-default" />
          {item(OBJ_MIETER_MENU.entfernen, onEntfernen, true)}
        </div>
      </PortalModalShell>
    </div>
  );
}
