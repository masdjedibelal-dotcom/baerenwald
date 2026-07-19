"use client";

import { MockIcon } from "@/components/shared/MockIcon";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import {
  PORTAL_NEUE_ANFRAGE_OPTIONS,
  PORTAL_NEUE_ANFRAGE_SUBTITLE,
  PORTAL_NEUE_ANFRAGE_TITLE,
  type PortalNeueAnfrageActionId,
} from "@/lib/portal2/modal-neue-anfrage";

export type PortalModalNeueAnfrageProps = {
  open?: boolean;
  onClose: () => void;
  onSelect: (id: PortalNeueAnfrageActionId) => void;
  /**
   * Optionen ausblenden (z. B. ohne Objekte kein Funnel).
   * Default: alle Mock-Optionen.
   */
  enabledIds?: readonly PortalNeueAnfrageActionId[];
  /** Hinweis über der Liste (z. B. „Bitte zuerst Objekt anlegen“) */
  notice?: string | null;
};

/**
 * Mock `modalNeueAnfrage()` — Einstieg Create → Funnel/Flows.
 */
export function PortalModalNeueAnfrage({
  open = true,
  onClose,
  onSelect,
  enabledIds,
  notice,
}: PortalModalNeueAnfrageProps) {
  const options = enabledIds
    ? PORTAL_NEUE_ANFRAGE_OPTIONS.filter((o) => enabledIds.includes(o.id))
    : PORTAL_NEUE_ANFRAGE_OPTIONS;

  return (
    <PortalModalShell
      open={open}
      title={PORTAL_NEUE_ANFRAGE_TITLE}
      subtitle={PORTAL_NEUE_ANFRAGE_SUBTITLE}
      onClose={onClose}
    >
      {notice?.trim() ? (
        <p className="portal-neue-anfrage-notice">{notice}</p>
      ) : null}
      <div className="portal-neue-anfrage-list">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className="portal-neue-anfrage-option"
            onClick={() => onSelect(opt.id)}
          >
            <span className="portal-neue-anfrage-icon" aria-hidden>
              <MockIcon
                ctx="active"
                glyph={opt.glyph}
                size={18}
              />
            </span>
            <span className="portal-neue-anfrage-text">
              <span className="portal-neue-anfrage-title">{opt.title}</span>
              <span className="portal-neue-anfrage-sub">{opt.subtitle}</span>
            </span>
            <span className="portal-neue-anfrage-chevron" aria-hidden>
              ›
            </span>
          </button>
        ))}
      </div>
    </PortalModalShell>
  );
}
