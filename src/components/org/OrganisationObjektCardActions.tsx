"use client";

import {
  PortalActionMenu,
  type PortalActionMenuItem,
} from "@/components/shared/PortalActionMenu";
import { ORG_MELDE_LEGAL_REQUIRED_HINT } from "@/lib/org/melde-legal-urls";
import { cn } from "@/lib/utils";

type Props = {
  canAushang?: boolean;
  /** Melde aktiv, aber Legal-Links fehlen — Buttons sichtbar, disabled. */
  aushangBlockedHint?: string | null;
  onAushangPdf?: () => void;
  onQrCode?: () => void;
  onLinkKopieren?: () => void;
  onBearbeiten: () => void;
  onKopieren: () => void;
  onLoeschen: () => void;
};

/**
 * Listen-Aktionen Objektkarte: Primär „Aushang PDF“, Rest im ⋯-Menü
 * (`PortalActionMenu` → globale Bottom-Sheet-/Side-Over-Shell).
 */
export function OrganisationObjektCardActions({
  canAushang = false,
  aushangBlockedHint = null,
  onAushangPdf,
  onQrCode,
  onLinkKopieren,
  onBearbeiten,
  onKopieren,
  onLoeschen,
}: Props) {
  const blocked = Boolean(aushangBlockedHint);
  const actionsLive = canAushang && !blocked;
  const showAushangChrome = canAushang || blocked;

  const items: PortalActionMenuItem[] = [
    ...(showAushangChrome && onLinkKopieren
      ? [
          {
            label: "Link kopieren",
            onClick: onLinkKopieren,
            disabled: blocked,
          },
        ]
      : []),
    ...(showAushangChrome && onQrCode
      ? [
          {
            label: "QR-Code",
            onClick: onQrCode,
            disabled: blocked,
          },
        ]
      : []),
    { label: "Bearbeiten", onClick: onBearbeiten },
    { label: "Kopieren", onClick: onKopieren },
    {
      label: "Löschen",
      onClick: onLoeschen,
      danger: true,
      dividerBefore: true,
    },
  ];

  return (
    <div
      className="relative flex flex-wrap items-center gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      {showAushangChrome && onAushangPdf ? (
        <button
          type="button"
          disabled={blocked}
          title={
            blocked
              ? aushangBlockedHint ?? ORG_MELDE_LEGAL_REQUIRED_HINT
              : "Aushang-PDF im Browser öffnen"
          }
          className={cn(
            "rounded-full border px-2.5 py-1 text-[11.5px] font-semibold",
            blocked
              ? "cursor-not-allowed border-border-default bg-muted text-text-tertiary opacity-60"
              : "border-accent bg-accent-light text-accent"
          )}
          onClick={() => {
            if (blocked || !actionsLive) return;
            onAushangPdf();
          }}
        >
          ▦ Aushang PDF
        </button>
      ) : null}

      <PortalActionMenu title="Aktionen" items={items} />
    </div>
  );
}
