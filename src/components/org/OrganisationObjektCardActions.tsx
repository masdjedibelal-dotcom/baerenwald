"use client";

import {
  PortalActionMenu,
  type PortalActionMenuItem,
} from "@/components/shared/PortalActionMenu";

type Props = {
  canAushang?: boolean;
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
  onAushangPdf,
  onQrCode,
  onLinkKopieren,
  onBearbeiten,
  onKopieren,
  onLoeschen,
}: Props) {
  const items: PortalActionMenuItem[] = [
    ...(canAushang && onLinkKopieren
      ? [{ label: "Link kopieren", onClick: onLinkKopieren }]
      : []),
    ...(canAushang && onQrCode
      ? [{ label: "QR-Code", onClick: onQrCode }]
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
      {canAushang && onAushangPdf ? (
        <button
          type="button"
          title="Aushang-PDF im Browser öffnen"
          className="rounded-full border border-accent bg-accent-light px-2.5 py-1 text-[11.5px] font-semibold text-accent"
          onClick={onAushangPdf}
        >
          ▦ Aushang PDF
        </button>
      ) : null}

      <PortalActionMenu title="Aktionen" items={items} />
    </div>
  );
}
