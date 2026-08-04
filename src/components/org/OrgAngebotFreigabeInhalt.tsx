"use client";

import { PortalDetailLeistungenPreisListe } from "@/components/shared/PortalDetailUi";
import type { PortalAngebotPositionDisplay } from "@/lib/portal/portal-angebot-display";
import { fmtPortalDate } from "@/lib/shared/portal-detail-format";

export type OrgFreigabeAngebot = {
  id: string;
  lead_id?: string | null;
  angebotsnr?: string | null;
  gueltig_bis?: string | null;
  leistungsumfang?: string | null;
  notizen?: string | null;
  pdf_url?: string | null;
  gesendet_am?: string | null;
  positionenDisplay?: PortalAngebotPositionDisplay[];
  gesamtBrutto?: number;
  dokumente?: Array<{
    id: string;
    name: string;
    href?: string;
    datum?: string | null;
  }>;
};

export function orgAngebotPdfZeilen(angebot: OrgFreigabeAngebot) {
  const pdfHref =
    angebot.dokumente?.find((d) => d.href?.trim())?.href?.trim() ??
    angebot.pdf_url?.trim() ??
    null;
  if (!pdfHref) return [];
  return [
    {
      id: `angebot-pdf-${angebot.id}`,
      name: angebot.angebotsnr?.trim()
        ? `Angebot ${angebot.angebotsnr.trim()}`
        : "Angebot (PDF)",
      datum: angebot.gesendet_am ?? null,
      href: pdfHref,
    },
  ];
}

export function OrgAngebotFreigabeInhalt({
  angebot,
}: {
  angebot: OrgFreigabeAngebot;
}) {
  const positionen = angebot.positionenDisplay ?? [];
  const hatPreise =
    positionen.length > 0 ||
    (typeof angebot.gesamtBrutto === "number" && angebot.gesamtBrutto > 0);

  return (
    <div className="rounded-xl border border-border-default bg-surface-card p-4 space-y-3">
        <div>
          <p className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
            Angebot von Bärenwald
          </p>
          <p className="font-semibold text-text-primary mt-1">
            {angebot.angebotsnr?.trim()
              ? `Angebot ${angebot.angebotsnr.trim()}`
              : "Angebot zur Freigabe"}
          </p>
          {angebot.gueltig_bis ? (
            <p className="text-xs text-text-secondary mt-1">
              Gültig bis {fmtPortalDate(angebot.gueltig_bis)}
            </p>
          ) : null}
        </div>

        {angebot.leistungsumfang?.trim() ? (
          <div>
            <p className="text-xs font-medium text-text-tertiary mb-1">
              Leistungsumfang
            </p>
            <p className="text-sm whitespace-pre-wrap text-text-primary">
              {angebot.leistungsumfang.trim()}
            </p>
          </div>
        ) : null}

        {hatPreise ? (
          <PortalDetailLeistungenPreisListe
            items={positionen}
            gesamtBrutto={angebot.gesamtBrutto}
            gesamtLabel="Gesamtpreis brutto inkl. MwSt."
          />
        ) : (
          <p className="text-sm text-text-secondary rounded-lg bg-muted/40 p-3">
            Die Angebotspositionen werden gerade übermittelt. Bitte Seite neu
            laden oder Bärenwald kontaktieren.
          </p>
        )}

        {angebot.notizen?.trim() ? (
          <div>
            <p className="text-xs font-medium text-text-tertiary mb-1">
              Hinweise zum Angebot
            </p>
            <p className="text-sm whitespace-pre-wrap text-text-secondary">
              {angebot.notizen.trim()}
            </p>
          </div>
        ) : null}
    </div>
  );
}
