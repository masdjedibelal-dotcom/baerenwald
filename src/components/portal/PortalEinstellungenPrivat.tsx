"use client";

import { EinstellungenPfRow } from "@/components/shared/PortalEinstellungenUi";
import {
  EINSTELLUNGEN_PROFIL_EDIT,
  einstellungenPageTitle,
} from "@/lib/portal2/einstellungen";
import { einstellungenMaxWidthClass } from "@/lib/portal2/einstellungen-ui";
import type { PortalKundeTyp } from "@/lib/portal2/kunde-typ";
import { portalKundeTypRoleLabel } from "@/lib/portal2/kunde-typ";

type Props = {
  name?: string | null;
  email?: string | null;
  telefon?: string | null;
  kundeTyp: Exclude<PortalKundeTyp, "hv">;
};

/**
 * D12 schlanke Variante für Privat/Gewerbe — Profil (pf) + Abmelden, kein Branding.
 */
export function PortalEinstellungenPrivat({
  name,
  email,
  telefon,
  kundeTyp,
}: Props) {
  return (
    <div
      className={`mx-auto flex w-full flex-col gap-3.5 ${einstellungenMaxWidthClass("privat")}`}
    >
      <div className="space-y-0.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          {portalKundeTypRoleLabel(kundeTyp)}
        </p>
        <h2 className="portal-text-section text-text-primary">
          {einstellungenPageTitle("privat")}
        </h2>
      </div>

      <section className="card-bordered space-y-2.5 p-4 sm:p-5">
        <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-text-primary">
          Profil
        </h3>
        <EinstellungenPfRow label="Name" value={name?.trim() || "—"} />
        <EinstellungenPfRow label="E-Mail" value={email?.trim() || "—"} />
        <EinstellungenPfRow label="Telefon" value={telefon?.trim() || "—"} />
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
      </section>

      <form action="/portal/auth/signout" method="post">
        <button type="submit" className="btn-pill-outline w-full">
          Abmelden
        </button>
      </form>
    </div>
  );
}
