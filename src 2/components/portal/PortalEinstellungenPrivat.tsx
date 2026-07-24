"use client";

import { PortalEinstellungenShell } from "@/components/shared/PortalEinstellungenShell";
import { EinstellungenPfRow } from "@/components/shared/PortalEinstellungenUi";
import { EINSTELLUNGEN_PROFIL_EDIT } from "@/lib/portal2/einstellungen";
import type { PortalKundeTyp } from "@/lib/portal2/kunde-typ";
import { portalKundeTypRoleLabel } from "@/lib/portal2/kunde-typ";
import { PORTAL_C } from "@/lib/portal2/tokens";

type Props = {
  name?: string | null;
  email?: string | null;
  telefon?: string | null;
  kundeTyp: Exclude<PortalKundeTyp, "hv">;
};

/**
 * D12 Privat/Gewerbe — Einstellungen (nur Profil), Mock-Chrome ohne Subnav-Liste.
 */
export function PortalEinstellungenPrivat({
  name,
  email,
  telefon,
  kundeTyp,
}: Props) {
  return (
    <div className="space-y-4">
      <PortalEinstellungenShell
        variant="privat"
        eyebrow={portalKundeTypRoleLabel(kundeTyp)}
      >
        {() => (
          <div className="space-y-2.5">
            <h3
              className="text-sm font-bold"
              style={{
                color: PORTAL_C.ink,
                fontFamily: "var(--p2-font-head, " + PORTAL_C.head + ")",
              }}
            >
              Profil
            </h3>
            <EinstellungenPfRow label="Name" value={name?.trim() || "—"} />
            <EinstellungenPfRow label="E-Mail" value={email?.trim() || "—"} />
            <EinstellungenPfRow
              label="Telefon"
              value={telefon?.trim() || "—"}
            />
            <p className="text-[12.5px] leading-relaxed text-text-secondary">
              Stammdaten ändern Sie über den Support —{" "}
              <a
                href="mailto:hello@baerenwald.de?subject=MeinBärenwald%20Profil"
                className="font-semibold text-accent underline"
              >
                {EINSTELLUNGEN_PROFIL_EDIT}
              </a>
              .
            </p>
          </div>
        )}
      </PortalEinstellungenShell>

      <div className="px-4 lg:px-6">
        <form action="/portal/auth/signout" method="post">
          <button type="submit" className="btn-pill-outline w-full">
            Abmelden
          </button>
        </form>
      </div>
    </div>
  );
}
